import { createApp } from '@server/main/app';
import { MovementStatus } from '@shared/enums';
import { describe, expect, it, vi } from 'vitest';

describe('Controller Seam: Student Return by RA & Attended Time Calculation (app.inject)', () => {
  async function startActiveSession(
    app: Awaited<ReturnType<typeof createApp>>['app'],
    options: {
      classCode?: string;
      subject?: string;
      roomId?: string;
      plannedDurationMinutes?: number;
    } = {},
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
      payload: {
        classCode: options.classCode ?? '1A',
        subject: options.subject ?? 'Matemática',
        roomId: options.roomId ?? 'SALA-01',
        plannedDurationMinutes: options.plannedDurationMinutes ?? 50,
      },
    });
    expect(startRes.statusCode).toBe(201);
    return {
      token,
      session: startRes.json().session as {
        id: string;
        classCode: string;
        plannedDurationMinutes: number;
      },
    };
  }

  it('registers student return via POST /movements/return, calculates outside/attended minutes and percentage, broadcasts Socket notification, and frees the room slot', async () => {
    let currentTime = new Date('2026-03-10T08:10:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });
    const notifyReturnSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementReturn',
    );

    const { session } = await startActiveSession(app, {
      classCode: '1A',
      subject: 'Matemática',
      plannedDurationMinutes: 50,
    });

    // 1. Student 1001 (Lucas Silva) exits at 08:10:00
    const exitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: {
        ra: '1001',
        sessionId: session.id,
      },
    });
    expect(exitRes.statusCode).toBe(201);

    // 2. Advance clock by 6 minutes -> 08:16:00
    currentTime = new Date('2026-03-10T08:16:00.000Z');

    // 3. Student 1001 registers return via POST /movements/return
    const returnRes = await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: {
        ra: '1001',
        sessionId: session.id,
      },
    });

    expect(returnRes.statusCode).toBe(200);
    const body = returnRes.json();
    expect(body.movement).toMatchObject({
      id: exitRes.json().movement.id,
      sessionId: session.id,
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      studentPublicName: 'Lucas S.',
      status: MovementStatus.RETURNED_NORMAL,
      startedAt: '2026-03-10T08:10:00.000Z',
      endedAt: '2026-03-10T08:16:00.000Z',
      durationMinutes: 6,
      attendedMinutes: 44,
      attendancePercentage: 88,
    });

    // Real-time return event broadcast via INotificationSender
    expect(notifyReturnSpy).toHaveBeenCalledTimes(1);
    expect(notifyReturnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: body.movement.id,
        studentRa: '1001',
        status: MovementStatus.RETURNED_NORMAL,
        durationMinutes: 6,
        attendedMinutes: 44,
        attendancePercentage: 88,
      }),
    );

    // 4. Active session now has 0 active movements (room is free)
    const activeRes = await app.inject({
      method: 'GET',
      url: '/sessions/active?roomId=SALA-01',
    });
    expect(activeRes.statusCode).toBe(200);
    expect(activeRes.json().activeMovements).toHaveLength(0);

    // 5. Next student (1002 - João Mendes) can now exit without 409 Conflict
    const nextExitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: {
        ra: '1002',
        sessionId: session.id,
      },
    });
    expect(nextExitRes.statusCode).toBe(201);
    expect(nextExitRes.json().movement).toMatchObject({
      studentRa: '1002',
      studentPublicName: 'João M.',
      status: MovementStatus.IN_TRANSIT,
    });

    await app.close();
  });

  it('returns HTTP 404 when attempting to register return for an RA with no active exit or already returned, and 400 for invalid RA', async () => {
    let currentTime = new Date('2026-03-10T09:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const { session } = await startActiveSession(app, {
      classCode: '1A',
      subject: 'Português',
    });

    // Invalid RA -> 400
    const invalidRaRes = await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: {
        ra: 'ABC',
        sessionId: session.id,
      },
    });
    expect(invalidRaRes.statusCode).toBe(400);

    // Student 1001 has not exited yet -> 404
    const noActiveExitRes = await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: {
        ra: '1001',
        sessionId: session.id,
      },
    });
    expect(noActiveExitRes.statusCode).toBe(404);
    expect(noActiveExitRes.json()).toMatchObject({
      error: expect.stringMatching(/saída ativa|não encontrad/i),
    });

    // Student 1001 exits and returns -> 200
    await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session.id },
    });
    currentTime = new Date('2026-03-10T09:05:00.000Z');
    const firstReturnRes = await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(firstReturnRes.statusCode).toBe(200);

    // Attempting a second return for 1001 when already returned -> 404
    const duplicateReturnRes = await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(duplicateReturnRes.statusCode).toBe(404);

    await app.close();
  });

  it('computes accurate attendance percentage against custom session plannedDurationMinutes', async () => {
    let currentTime = new Date('2026-03-10T10:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const { session } = await startActiveSession(app, {
      classCode: '1A',
      subject: 'Física',
      plannedDurationMinutes: 40,
    });

    // Student 1003 (Ana Costa) exits at 10:00:00
    const exitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1003', sessionId: session.id },
    });
    expect(exitRes.statusCode).toBe(201);

    // Returns at 10:10:00 -> 10 minutes outside out of 40 planned -> 30 min attended (75%)
    currentTime = new Date('2026-03-10T10:10:00.000Z');
    const returnRes = await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1003' }, // Also works without explicit sessionId when room has active movement
    });

    expect(returnRes.statusCode).toBe(200);
    expect(returnRes.json().movement).toMatchObject({
      studentRa: '1003',
      studentPublicName: 'Ana C.',
      status: MovementStatus.RETURNED_NORMAL,
      durationMinutes: 10,
      attendedMinutes: 30,
      attendancePercentage: 75,
    });

    await app.close();
  });
});
