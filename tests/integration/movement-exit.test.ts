import { createApp } from '@server/main/app';
import { AlertLevel, MovementStatus } from '@shared/enums';
import { describe, expect, it, vi } from 'vitest';

describe('Controller Seam: Student Exit by RA & Single-Exit Concurrency (app.inject)', () => {
  async function startActiveSession(
    app: Awaited<ReturnType<typeof createApp>>['app'],
    classCode = '1A',
    subject = 'Matemática',
    roomId = 'SALA-01',
  ) {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'prof@linsdorego.edu.br',
        password: 'senha123',
      },
    });
    const { token } = loginRes.json() as { token: string };

    const startRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${token}` },
      payload: { classCode, subject, roomId },
    });
    expect(startRes.statusCode).toBe(201);
    return {
      token,
      session: startRes.json().session as { id: string; classCode: string },
    };
  }

  it('registers a student exit via POST /movements/exit, returns LGPD abbreviated name, and emits real-time notification', async () => {
    const currentTime = new Date('2026-03-10T08:10:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });
    const notifyExitSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementExit',
    );

    const { session } = await startActiveSession(app, '1A', 'Matemática');

    const exitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: {
        ra: '1001',
        sessionId: session.id,
      },
    });

    expect(exitRes.statusCode).toBe(201);
    const body = exitRes.json();
    expect(body.movement).toMatchObject({
      id: expect.any(String),
      sessionId: session.id,
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      studentPublicName: 'Lucas S.',
      abbreviatedName: 'Lucas S.',
      classCode: '1A',
      subject: 'Matemática',
      status: MovementStatus.IN_TRANSIT,
      alertLevel: AlertLevel.GREEN,
      startedAt: '2026-03-10T08:10:00.000Z',
      allowedLimitMinutes: 10,
      isEmergency: false,
      isGuest: false,
    });

    expect(notifyExitSpy).toHaveBeenCalledTimes(1);
    expect(notifyExitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: body.movement.id,
        studentRa: '1001',
        studentPublicName: 'Lucas S.',
        status: MovementStatus.IN_TRANSIT,
      }),
    );

    // Active session endpoint now includes the student in activeMovements
    const activeRes = await app.inject({
      method: 'GET',
      url: '/sessions/active?roomId=SALA-01',
    });
    expect(activeRes.statusCode).toBe(200);
    expect(activeRes.json().activeMovements).toHaveLength(1);
    expect(activeRes.json().activeMovements[0]).toMatchObject({
      studentRa: '1001',
      studentPublicName: 'Lucas S.',
      status: MovementStatus.IN_TRANSIT,
    });

    await app.close();
  });

  it('enforces single-exit concurrency by blocking a second student with HTTP 409 Conflict when the classroom is already occupied', async () => {
    const currentTime = new Date('2026-03-10T08:15:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });
    const notifyExitSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementExit',
    );

    const { session } = await startActiveSession(app, '1A', 'História');

    // First student (Lucas Silva - RA 1001) exits -> 201 Created
    const firstExitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: {
        ra: '1001',
        sessionId: session.id,
      },
    });
    expect(firstExitRes.statusCode).toBe(201);

    // Second student (João Mendes - RA 1002) tries to exit while Lucas is out -> 409 Conflict
    const secondExitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: {
        ra: '1002',
        sessionId: session.id,
      },
    });
    expect(secondExitRes.statusCode).toBe(409);
    expect(secondExitRes.json()).toMatchObject({
      error: expect.stringMatching(/fora da sala|ocupad|concorrência|aguarde/i),
    });

    // Notification was only sent once (for the first student)
    expect(notifyExitSpy).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('validates RA format, student existence, class membership, and medical special time limit', async () => {
    const currentTime = new Date('2026-03-10T08:20:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    // No active session yet -> 404
    const noSessionRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001' },
    });
    expect(noSessionRes.statusCode).toBe(404);

    const { session } = await startActiveSession(app, '1A', 'Biologia');

    // Invalid RA format -> 400
    const badRaRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: 'ABC', sessionId: session.id },
    });
    expect(badRaRes.statusCode).toBe(400);

    // Unknown RA -> 404
    const unknownRaRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '9999', sessionId: session.id },
    });
    expect(unknownRaRes.statusCode).toBe(404);

    // Student from another class (RA 2001 is in 2B, active session is 1A) -> 403
    const wrongClassRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '2001', sessionId: session.id },
    });
    expect(wrongClassRes.statusCode).toBe(403);

    // Student with medical Tempo Especial (RA 1003 - Ana Costa, 20 min) -> 201 with allowedLimitMinutes: 20
    const specialLimitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1003', sessionId: session.id },
    });
    expect(specialLimitRes.statusCode).toBe(201);
    expect(specialLimitRes.json().movement).toMatchObject({
      studentRa: '1003',
      studentPublicName: 'Ana C.',
      allowedLimitMinutes: 20,
      status: MovementStatus.IN_TRANSIT,
    });

    await app.close();
  });
});
