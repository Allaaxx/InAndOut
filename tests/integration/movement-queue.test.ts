import { createApp } from '@server/main/app';
import { MovementStatus, QueueEntryStatus } from '@shared/enums';
import { describe, expect, it, vi } from 'vitest';

describe('Controller Seam: FIFO Waiting Queue, 2-Minute Confirmation Window & Voluntary Cancellation (app.inject)', () => {
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

  it('enqueues waiting students in FIFO order, promotes the first on return with a 2-minute confirmation window, and starts exit on valid claim', async () => {
    let currentTime = new Date('2026-03-10T08:10:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });

    const notifyQueueUpdatedSpy = vi.spyOn(
      container.notificationSender,
      'notifyQueueUpdated',
    );
    const notifyQueueSlotCalledSpy = vi.spyOn(
      container.notificationSender,
      'notifyQueueSlotCalled',
    );
    const notifyExitSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementExit',
    );

    const { session } = await startActiveSession(app, '1A', 'Matemática');

    // 1. Student 1001 (Lucas S.) exits -> room is now occupied
    const exitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(exitRes.statusCode).toBe(201);

    // 2. Student 1002 (João Mendes) joins the FIFO queue at 08:11:00 -> position 1
    currentTime = new Date('2026-03-10T08:11:00.000Z');
    const enqueue1Res = await app.inject({
      method: 'POST',
      url: '/movements/queue',
      payload: { ra: '1002', sessionId: session.id },
    });
    expect(enqueue1Res.statusCode).toBe(201);
    expect(enqueue1Res.json().entry).toMatchObject({
      sessionId: session.id,
      studentRa: '1002',
      studentPublicName: 'João M.',
      abbreviatedName: 'João M.',
      position: 1,
      status: QueueEntryStatus.WAITING,
    });
    expect(enqueue1Res.json().queue).toHaveLength(1);
    expect(notifyQueueUpdatedSpy).toHaveBeenCalledTimes(1);

    // 3. Student 1003 (Ana Costa) joins the FIFO queue at 08:12:00 -> position 2
    currentTime = new Date('2026-03-10T08:12:00.000Z');
    const enqueue2Res = await app.inject({
      method: 'POST',
      url: '/movements/queue',
      payload: { ra: '1003', sessionId: session.id },
    });
    expect(enqueue2Res.statusCode).toBe(201);
    expect(enqueue2Res.json().entry).toMatchObject({
      studentRa: '1003',
      studentPublicName: 'Ana C.',
      position: 2,
      status: QueueEntryStatus.WAITING,
    });
    expect(enqueue2Res.json().queue).toHaveLength(2);
    expect(
      enqueue2Res.json().queue.map((q: { studentRa: string }) => q.studentRa),
    ).toEqual(['1002', '1003']);

    // Rejects duplicate queue entry for 1002 or enqueueing currently outside student 1001 with 409
    const duplicateEnqueueRes = await app.inject({
      method: 'POST',
      url: '/movements/queue',
      payload: { ra: '1002', sessionId: session.id },
    });
    expect(duplicateEnqueueRes.statusCode).toBe(409);

    const outsideEnqueueRes = await app.inject({
      method: 'POST',
      url: '/movements/queue',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(outsideEnqueueRes.statusCode).toBe(409);

    // 4. Student 1001 returns at 08:15:00 -> Student 1002 is automatically promoted to CALLED with 2-minute window
    currentTime = new Date('2026-03-10T08:15:00.000Z');
    const returnRes = await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(returnRes.statusCode).toBe(200);
    expect(returnRes.json().nextCalledQueueEntry).toMatchObject({
      studentRa: '1002',
      studentPublicName: 'João M.',
      position: 1,
      status: QueueEntryStatus.CALLED,
      calledAt: '2026-03-10T08:15:00.000Z',
      expiresAt: '2026-03-10T08:17:00.000Z',
    });
    expect(notifyQueueSlotCalledSpy).toHaveBeenCalledWith(
      session.id,
      expect.objectContaining({
        studentRa: '1002',
        status: QueueEntryStatus.CALLED,
        expiresAt: '2026-03-10T08:17:00.000Z',
      }),
    );

    // 5. Student 1003 (2nd in queue) tries to claim while 1002's 2-minute window is active -> 409 Conflict
    currentTime = new Date('2026-03-10T08:16:00.000Z');
    const wrongTurnClaimRes = await app.inject({
      method: 'POST',
      url: '/movements/queue/claim',
      payload: { ra: '1003', sessionId: session.id },
    });
    expect(wrongTurnClaimRes.statusCode).toBe(409);

    // 6. Student 1002 confirms within the 2-minute window (at 08:16:30) -> 201 Created
    currentTime = new Date('2026-03-10T08:16:30.000Z');
    const claimRes = await app.inject({
      method: 'POST',
      url: '/movements/queue/claim',
      payload: { ra: '1002', sessionId: session.id },
    });
    expect(claimRes.statusCode).toBe(201);
    expect(claimRes.json().movement).toMatchObject({
      sessionId: session.id,
      studentRa: '1002',
      studentPublicName: 'João M.',
      status: MovementStatus.IN_TRANSIT,
      startedAt: '2026-03-10T08:16:30.000Z',
    });
    expect(claimRes.json().queue).toHaveLength(1);
    expect(claimRes.json().queue[0]).toMatchObject({
      studentRa: '1003',
      studentPublicName: 'Ana C.',
      position: 1,
      status: QueueEntryStatus.WAITING,
    });
    expect(notifyExitSpy).toHaveBeenCalledTimes(2);

    await app.close();
  });

  it('expires the 2-minute confirmation window when unconfirmed and transfers the slot to the next student in FIFO order', async () => {
    let currentTime = new Date('2026-03-10T09:00:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });

    const notifyQueueSlotCalledSpy = vi.spyOn(
      container.notificationSender,
      'notifyQueueSlotCalled',
    );

    const { session } = await startActiveSession(app, '1A', 'História');

    // 1. Student 1001 exits; 1002 and 1003 join queue
    await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session.id },
    });

    currentTime = new Date('2026-03-10T09:01:00.000Z');
    await app.inject({
      method: 'POST',
      url: '/movements/queue',
      payload: { ra: '1002', sessionId: session.id },
    });

    currentTime = new Date('2026-03-10T09:02:00.000Z');
    await app.inject({
      method: 'POST',
      url: '/movements/queue',
      payload: { ra: '1003', sessionId: session.id },
    });

    // 2. Student 1001 returns at 09:05:00 -> 1002 is CALLED until 09:07:00
    currentTime = new Date('2026-03-10T09:05:00.000Z');
    await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(notifyQueueSlotCalledSpy).toHaveBeenLastCalledWith(
      session.id,
      expect.objectContaining({
        studentRa: '1002',
        status: QueueEntryStatus.CALLED,
        expiresAt: '2026-03-10T09:07:00.000Z',
      }),
    );

    // 3. Advance clock past the 2-minute confirmation window -> 09:07:05 (2m 5s elapsed)
    currentTime = new Date('2026-03-10T09:07:05.000Z');

    // Student 1002 tries to claim after window expired -> rejected with 409, and slot transfers to 1003 (Ana C.)
    const expiredClaimRes = await app.inject({
      method: 'POST',
      url: '/movements/queue/claim',
      payload: { ra: '1002', sessionId: session.id },
    });
    expect(expiredClaimRes.statusCode).toBe(409);
    expect(expiredClaimRes.json()).toMatchObject({
      error: expect.stringMatching(/expir|2 minutos|próximo/i),
    });

    // Notification was sent calling 1003 (Ana C.) for her 2-minute confirmation window
    expect(notifyQueueSlotCalledSpy).toHaveBeenLastCalledWith(
      session.id,
      expect.objectContaining({
        studentRa: '1003',
        studentPublicName: 'Ana C.',
        position: 1,
        status: QueueEntryStatus.CALLED,
        calledAt: '2026-03-10T09:07:05.000Z',
        expiresAt: '2026-03-10T09:09:05.000Z',
      }),
    );

    // 4. Student 1003 (Ana C.) claims her slot within her 2-minute window at 09:07:30 -> 201 Created
    currentTime = new Date('2026-03-10T09:07:30.000Z');
    const nextClaimRes = await app.inject({
      method: 'POST',
      url: '/movements/queue/claim',
      payload: { ra: '1003', sessionId: session.id },
    });
    expect(nextClaimRes.statusCode).toBe(201);
    expect(nextClaimRes.json().movement).toMatchObject({
      studentRa: '1003',
      studentPublicName: 'Ana C.',
      status: MovementStatus.IN_TRANSIT,
      allowedLimitMinutes: 20,
    });
    expect(nextClaimRes.json().queue).toHaveLength(0);

    await app.close();
  });

  it('allows voluntary cancellation via DELETE /movements/queue/:ra, reindexes positions, and promotes next student if the CALLED head cancels', async () => {
    let currentTime = new Date('2026-03-10T10:00:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });

    const notifyQueueUpdatedSpy = vi.spyOn(
      container.notificationSender,
      'notifyQueueUpdated',
    );
    const notifyQueueSlotCalledSpy = vi.spyOn(
      container.notificationSender,
      'notifyQueueSlotCalled',
    );

    const { session } = await startActiveSession(app, '1A', 'Geografia');

    // 1. Student 1001 exits; 1002 and 1003 join queue
    await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session.id },
    });

    currentTime = new Date('2026-03-10T10:01:00.000Z');
    await app.inject({
      method: 'POST',
      url: '/movements/queue',
      payload: { ra: '1002', sessionId: session.id },
    });

    currentTime = new Date('2026-03-10T10:02:00.000Z');
    await app.inject({
      method: 'POST',
      url: '/movements/queue',
      payload: { ra: '1003', sessionId: session.id },
    });

    // 2. Student 1001 returns -> 1002 becomes CALLED
    currentTime = new Date('2026-03-10T10:04:00.000Z');
    await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001', sessionId: session.id },
    });

    // 3. Student 1002 voluntarily cancels their queue slot via DELETE /movements/queue/1002
    currentTime = new Date('2026-03-10T10:04:30.000Z');
    const cancelRes = await app.inject({
      method: 'DELETE',
      url: `/movements/queue/1002?sessionId=${session.id}`,
    });
    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.json().cancelled).toBe(true);
    expect(cancelRes.json().queue).toHaveLength(1);
    expect(cancelRes.json().queue[0]).toMatchObject({
      studentRa: '1003',
      studentPublicName: 'Ana C.',
      position: 1,
      status: QueueEntryStatus.CALLED,
      calledAt: '2026-03-10T10:04:30.000Z',
      expiresAt: '2026-03-10T10:06:30.000Z',
    });

    expect(notifyQueueSlotCalledSpy).toHaveBeenLastCalledWith(
      session.id,
      expect.objectContaining({
        studentRa: '1003',
        status: QueueEntryStatus.CALLED,
      }),
    );
    expect(notifyQueueUpdatedSpy).toHaveBeenCalled();

    // 4. Attempting to cancel an RA not in the queue returns 404
    const notFoundCancelRes = await app.inject({
      method: 'DELETE',
      url: `/movements/queue/1002?sessionId=${session.id}`,
    });
    expect(notFoundCancelRes.statusCode).toBe(404);

    await app.close();
  });
});
