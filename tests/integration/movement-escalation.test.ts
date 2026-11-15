import { createApp } from '@server/main/app';
import { AlertLevel, MovementStatus } from '@shared/enums';
import { describe, expect, it, vi } from 'vitest';

describe('Controller Seam: Time Limit Monitoring, Medical Tempo Especial & 2-Minute Hybrid Escalation (app.inject)', () => {
  async function startActiveSession(
    app: Awaited<ReturnType<typeof createApp>>['app'],
    classCode = '1A',
    subject = 'Matemática',
    roomId = 'SALA-01',
    defaultTimeLimitMinutes = 10,
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
      payload: { classCode, subject, roomId, defaultTimeLimitMinutes },
    });
    expect(startRes.statusCode).toBe(201);
    return {
      token,
      session: startRes.json().session as { id: string; classCode: string },
    };
  }

  it('manually escalates an active movement via POST /movements/:id/escalate and notifies Coordination via INotificationSender', async () => {
    let currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });
    const notifyEscalatedSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementEscalated',
    );

    const { token, session } = await startActiveSession(
      app,
      '1A',
      'Matemática',
    );

    const exitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(exitRes.statusCode).toBe(201);
    const movementId = exitRes.json().movement.id as string;

    // Advance clock to 11 minutes (overdue) and teacher clicks "Escalar para Coordenação"
    currentTime = new Date('2026-03-10T08:11:00.000Z');

    const escalateRes = await app.inject({
      method: 'POST',
      url: `/movements/${movementId}/escalate`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        notes:
          'Aluno demorou mais de 10 minutos, solicitando apoio da Coordenação.',
      },
    });

    expect(escalateRes.statusCode).toBe(200);
    expect(escalateRes.json().movement).toMatchObject({
      id: movementId,
      studentRa: '1001',
      studentPublicName: 'Lucas S.',
      status: MovementStatus.ESCALATED_TO_COORDINATION,
      alertLevel: AlertLevel.RED,
      escalationType: 'MANUAL',
      escalatedAt: '2026-03-10T08:11:00.000Z',
      resolutionNotes:
        'Aluno demorou mais de 10 minutos, solicitando apoio da Coordenação.',
    });

    expect(notifyEscalatedSpy).toHaveBeenCalledTimes(1);
    expect(notifyEscalatedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: movementId,
        studentRa: '1001',
        status: MovementStatus.ESCALATED_TO_COORDINATION,
        escalationType: 'MANUAL',
      }),
    );

    // Non-existent movement returns 404
    const notFoundRes = await app.inject({
      method: 'POST',
      url: '/movements/non-existent-id/escalate',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(notFoundRes.statusCode).toBe(404);

    // Invalid token returns 401
    const badTokenRes = await app.inject({
      method: 'POST',
      url: `/movements/${movementId}/escalate`,
      headers: { authorization: 'Bearer invalid-token' },
      payload: {},
    });
    expect(badTokenRes.statusCode).toBe(401);

    await app.close();
  });

  it('transitions a movement through 80% YELLOW warning, >100% OVERDUE, and automatic escalation after the 2-minute teacher grace window expires', async () => {
    let currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });
    const notifyOverdueSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementOverdue',
    );
    const notifyEscalatedSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementEscalated',
    );

    const { session } = await startActiveSession(
      app,
      '1A',
      'Física',
      'SALA-01',
      10,
    );

    // Student Lucas S. (RA 1001, 10m limit) exits at 08:00
    const exitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(exitRes.statusCode).toBe(201);
    const movementId = exitRes.json().movement.id as string;

    // 1) At 08:08 (8 min = 80% of 10 min limit): YELLOW warning alert, not overdue yet
    currentTime = new Date('2026-03-10T08:08:00.000Z');
    const warningCheckRes = await app.inject({
      method: 'POST',
      url: '/movements/check-overdue',
      payload: { sessionId: session.id },
    });
    expect(warningCheckRes.statusCode).toBe(200);
    expect(warningCheckRes.json()).toMatchObject({
      alerts: [
        expect.objectContaining({
          id: movementId,
          studentRa: '1001',
          status: MovementStatus.IN_TRANSIT,
          alertLevel: AlertLevel.YELLOW,
          elapsedMinutes: 8,
        }),
      ],
      overdueMovements: [],
      autoEscalatedMovements: [],
    });
    expect(notifyOverdueSpy).not.toHaveBeenCalled();
    expect(notifyEscalatedSpy).not.toHaveBeenCalled();

    // 2) At 08:11 (11 min > 10 min limit): transitions to OVERDUE (RED) and opens 2-minute grace window
    currentTime = new Date('2026-03-10T08:11:00.000Z');
    const overdueCheckRes = await app.inject({
      method: 'POST',
      url: '/movements/check-overdue',
      payload: { sessionId: session.id },
    });
    expect(overdueCheckRes.statusCode).toBe(200);
    expect(overdueCheckRes.json()).toMatchObject({
      overdueMovements: [
        expect.objectContaining({
          id: movementId,
          studentRa: '1001',
          status: MovementStatus.OVERDUE,
          alertLevel: AlertLevel.RED,
          overdueAt: '2026-03-10T08:11:00.000Z',
        }),
      ],
      autoEscalatedMovements: [],
    });
    expect(notifyOverdueSpy).toHaveBeenCalledTimes(1);
    expect(notifyOverdueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: movementId,
        status: MovementStatus.OVERDUE,
        alertLevel: AlertLevel.RED,
      }),
    );
    expect(notifyEscalatedSpy).not.toHaveBeenCalled();

    // 3) At 08:12 (1 minute after overdueAt, inside the 2-minute grace window): still OVERDUE, no auto-escalation yet
    currentTime = new Date('2026-03-10T08:12:00.000Z');
    const graceCheckRes = await app.inject({
      method: 'POST',
      url: '/movements/check-overdue',
      payload: { sessionId: session.id },
    });
    expect(graceCheckRes.statusCode).toBe(200);
    expect(graceCheckRes.json().autoEscalatedMovements).toHaveLength(0);
    expect(notifyEscalatedSpy).not.toHaveBeenCalled();

    // 4) At 08:13 (2 minutes after overdueAt with no teacher action or return): auto-escalates to Coordination
    currentTime = new Date('2026-03-10T08:13:00.000Z');
    const autoEscalateRes = await app.inject({
      method: 'POST',
      url: '/movements/evaluate-overdue',
      payload: { sessionId: session.id },
    });
    expect(autoEscalateRes.statusCode).toBe(200);
    expect(autoEscalateRes.json()).toMatchObject({
      autoEscalatedMovements: [
        expect.objectContaining({
          id: movementId,
          studentRa: '1001',
          status: MovementStatus.ESCALATED_TO_COORDINATION,
          alertLevel: AlertLevel.RED,
          escalationType: 'AUTOMATIC',
          escalatedAt: '2026-03-10T08:13:00.000Z',
        }),
      ],
    });
    expect(notifyEscalatedSpy).toHaveBeenCalledTimes(1);
    expect(notifyEscalatedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: movementId,
        studentRa: '1001',
        status: MovementStatus.ESCALATED_TO_COORDINATION,
        escalationType: 'AUTOMATIC',
      }),
    );

    await app.close();
  });

  it('respects medical Tempo Especial (20 min) without false overdue alerts at 12 min, and cancels escalation if the student returns within the 2-minute grace window', async () => {
    let currentTime = new Date('2026-03-10T09:00:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });
    const notifyOverdueSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementOverdue',
    );
    const notifyEscalatedSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementEscalated',
    );

    const { session } = await startActiveSession(
      app,
      '1A',
      'Química',
      'SALA-01',
      10,
    );

    // Ana Costa (RA 1003, medical specialTimeLimitMinutes: 20) exits at 09:00
    const exitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1003', sessionId: session.id },
    });
    expect(exitRes.statusCode).toBe(201);
    expect(exitRes.json().movement.allowedLimitMinutes).toBe(20);

    // At 09:12 (12 minutes elapsed — 60% of 20 min): still GREEN, not in alerts or overdue
    currentTime = new Date('2026-03-10T09:12:00.000Z');
    const at12MinRes = await app.inject({
      method: 'POST',
      url: '/movements/check-overdue',
      payload: { sessionId: session.id },
    });
    expect(at12MinRes.statusCode).toBe(200);
    expect(at12MinRes.json()).toEqual({
      alerts: [],
      overdueMovements: [],
      autoEscalatedMovements: [],
    });
    expect(notifyOverdueSpy).not.toHaveBeenCalled();

    // At 09:16 (16 minutes elapsed — 80% of 20 min): YELLOW warning
    currentTime = new Date('2026-03-10T09:16:00.000Z');
    const at16MinRes = await app.inject({
      method: 'POST',
      url: '/movements/check-overdue',
      payload: { sessionId: session.id },
    });
    expect(at16MinRes.statusCode).toBe(200);
    expect(at16MinRes.json().alerts).toHaveLength(1);
    expect(at16MinRes.json().alerts[0]).toMatchObject({
      studentRa: '1003',
      alertLevel: AlertLevel.YELLOW,
      status: MovementStatus.IN_TRANSIT,
    });

    // At 09:21 (21 minutes elapsed — > 100% of 20 min): OVERDUE (RED), 2-minute grace window starts
    currentTime = new Date('2026-03-10T09:21:00.000Z');
    const at21MinRes = await app.inject({
      method: 'POST',
      url: '/movements/check-overdue',
      payload: { sessionId: session.id },
    });
    expect(at21MinRes.statusCode).toBe(200);
    expect(at21MinRes.json().overdueMovements).toHaveLength(1);
    expect(notifyOverdueSpy).toHaveBeenCalledTimes(1);

    // At 09:22 (within the 2-minute grace window), Ana returns to the classroom
    currentTime = new Date('2026-03-10T09:22:00.000Z');
    const returnRes = await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1003', sessionId: session.id },
    });
    expect(returnRes.statusCode).toBe(200);
    expect(returnRes.json().movement.status).toBe(
      MovementStatus.RETURNED_NORMAL,
    );

    // At 09:25 (after the 2-minute grace window would have ended), check-overdue does NOT auto-escalate
    currentTime = new Date('2026-03-10T09:25:00.000Z');
    const afterReturnCheckRes = await app.inject({
      method: 'POST',
      url: '/movements/check-overdue',
      payload: { sessionId: session.id },
    });
    expect(afterReturnCheckRes.statusCode).toBe(200);
    expect(afterReturnCheckRes.json()).toEqual({
      alerts: [],
      overdueMovements: [],
      autoEscalatedMovements: [],
    });
    expect(notifyEscalatedSpy).not.toHaveBeenCalled();

    await app.close();
  });
});
