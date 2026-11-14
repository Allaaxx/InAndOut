import { describe, it, expect, vi } from 'vitest';
import { createApp } from '@server/main/app';
import { AlertLevel, MovementStatus } from '@shared/enums';

describe('Controller Seam: Teacher Emergency Exit & Guest Student Override Endpoints (app.inject)', () => {
  async function loginAndStartSession(
    app: Awaited<ReturnType<typeof createApp>>['app'],
    classCode = '1A',
    subject = 'Matemática',
    roomId = 'SALA-01'
  ) {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'prof@linsdorego.edu.br',
        password: 'senha123',
      },
    });
    expect(loginRes.statusCode).toBe(200);
    const { token, user } = loginRes.json() as {
      token: string;
      user: { id: string; name: string };
    };

    const startRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${token}` },
      payload: { classCode, subject, roomId },
    });
    expect(startRes.statusCode).toBe(201);

    return {
      token,
      teacher: user,
      session: startRes.json().session as { id: string; classCode: string },
    };
  }

  it('authorizes concurrent student exit via POST /movements/emergency even when room is occupied and records teacher audit ID', async () => {
    const currentTime = new Date('2026-03-10T10:00:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });
    const notifyExitSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementExit'
    );

    const { token, teacher, session } = await loginAndStartSession(
      app,
      '1A',
      'Matemática'
    );

    // 1st student (RA 1001 - Lucas Silva) exits normally
    const firstExitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: {
        ra: '1001',
        sessionId: session.id,
      },
    });
    expect(firstExitRes.statusCode).toBe(201);

    // 2nd student (RA 1002 - João Mendes) tries normal exit -> blocked with 409 Conflict
    const blockedRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: {
        ra: '1002',
        sessionId: session.id,
      },
    });
    expect(blockedRes.statusCode).toBe(409);

    // Teacher authorizes Emergency Exit for 2nd student via POST /movements/emergency -> 201 Created
    const emergencyRes = await app.inject({
      method: 'POST',
      url: '/movements/emergency',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        ra: '1002',
        sessionId: session.id,
        reason: 'Mal-estar súbito em sala',
      },
    });

    expect(emergencyRes.statusCode).toBe(201);
    const body = emergencyRes.json();
    expect(body.movement).toMatchObject({
      sessionId: session.id,
      studentRa: '1002',
      studentFullName: 'João Mendes',
      studentPublicName: 'João M.',
      abbreviatedName: 'João M.',
      classCode: '1A',
      subject: 'Matemática',
      status: MovementStatus.IN_TRANSIT,
      alertLevel: AlertLevel.GREEN,
      isEmergency: true,
      isGuest: false,
      authorizedByTeacherId: teacher.id,
    });

    // Both students are now simultaneously outside in the active session
    const activeRes = await app.inject({
      method: 'GET',
      url: '/sessions/active?roomId=SALA-01',
    });
    expect(activeRes.statusCode).toBe(200);
    expect(activeRes.json().activeMovements).toHaveLength(2);
    expect(notifyExitSpy).toHaveBeenCalledTimes(2);

    await app.close();
  });

  it('rejects guest student exit without teacher permission and allows guest exit via POST /movements/guest-exit with teacher authorization and audit trail', async () => {
    const currentTime = new Date('2026-03-10T10:15:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });
    const notifyExitSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementExit'
    );

    const { token, teacher, session } = await loginAndStartSession(
      app,
      '1A',
      'História'
    );

    // 1. Guest student from another class (RA 2001 - Pedro Alves, class 2B) tries standard exit without teacher permission -> 403 Forbidden
    const standardExitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: {
        ra: '2001',
        sessionId: session.id,
      },
    });
    expect(standardExitRes.statusCode).toBe(403);
    expect(standardExitRes.json().error).toMatch(/turma|Autorização Avulsa/i);

    // 2. Calling POST /movements/guest-exit WITHOUT teacher token/PIN -> 401 Unauthorized
    const unauthGuestRes = await app.inject({
      method: 'POST',
      url: '/movements/guest-exit',
      payload: {
        ra: '2001',
        sessionId: session.id,
      },
    });
    expect(unauthGuestRes.statusCode).toBe(401);

    // 3. Calling POST /movements/emergency WITHOUT teacher token/PIN -> 401 Unauthorized
    const unauthEmergencyRes = await app.inject({
      method: 'POST',
      url: '/movements/emergency',
      payload: {
        ra: '1001',
        sessionId: session.id,
      },
    });
    expect(unauthEmergencyRes.statusCode).toBe(401);

    // 4. Teacher authorizes guest student (RA 2001 - Pedro Alves from 2B) via POST /movements/guest-exit -> 201 Created
    const guestExitRes = await app.inject({
      method: 'POST',
      url: '/movements/guest-exit',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        ra: '2001',
        sessionId: session.id,
      },
    });

    expect(guestExitRes.statusCode).toBe(201);
    expect(guestExitRes.json().movement).toMatchObject({
      sessionId: session.id,
      studentRa: '2001',
      studentFullName: 'Pedro Alves',
      studentPublicName: 'Pedro A.',
      classCode: '1A',
      subject: 'História',
      status: MovementStatus.IN_TRANSIT,
      isGuest: true,
      isEmergency: false,
      authorizedByTeacherId: teacher.id,
    });
    expect(notifyExitSpy).toHaveBeenCalledTimes(1);

    // 5. Also supports unindexed transfer student when teacher authorizes with forceConcurrent
    const transferGuestRes = await app.inject({
      method: 'POST',
      url: '/movements/guest-exit',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        ra: '3099',
        fullName: 'Beatriz Oliveira',
        originClassCode: 'Transferida-3B',
        sessionId: session.id,
        forceConcurrent: true,
      },
    });

    expect(transferGuestRes.statusCode).toBe(201);
    expect(transferGuestRes.json().movement).toMatchObject({
      sessionId: session.id,
      studentRa: '3099',
      studentFullName: 'Beatriz Oliveira',
      studentPublicName: 'Beatriz O.',
      isGuest: true,
      isEmergency: true,
      authorizedByTeacherId: teacher.id,
    });

    await app.close();
  });

  it('supports teacher PIN authorization and rejects invalid PINs or invalid student RAs on override endpoints', async () => {
    const currentTime = new Date('2026-03-10T10:30:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const { token, teacher, session } = await loginAndStartSession(
      app,
      '1A',
      'Química'
    );

    // Rejects wrong teacher PIN with 401
    const badPinRes = await app.inject({
      method: 'POST',
      url: '/movements/emergency',
      payload: {
        ra: '1001',
        sessionId: session.id,
        pin: '0000',
      },
    });
    expect(badPinRes.statusCode).toBe(401);

    // Accepts valid teacher PIN ('1234') and records teacher audit ID
    const validPinRes = await app.inject({
      method: 'POST',
      url: '/movements/emergency',
      payload: {
        ra: '1001',
        sessionId: session.id,
        pin: '1234',
      },
    });
    expect(validPinRes.statusCode).toBe(201);
    expect(validPinRes.json().movement).toMatchObject({
      studentRa: '1001',
      isEmergency: true,
      authorizedByTeacherId: teacher.id,
    });

    // Rejects invalid RA format with 400
    const badRaRes = await app.inject({
      method: 'POST',
      url: '/movements/guest-exit',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        ra: '   ',
        sessionId: session.id,
      },
    });
    expect(badRaRes.statusCode).toBe(400);

    await app.close();
  });
});
