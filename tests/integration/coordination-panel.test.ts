import { createApp } from '@server/main/app';
import { AlertLevel, MovementStatus } from '@shared/enums';
import { describe, expect, it, vi } from 'vitest';

describe('Controller Seam: Coordination Panel & Active Movements (app.inject)', () => {
  async function loginAs(
    app: Awaited<ReturnType<typeof createApp>>['app'],
    email: string,
    password: string,
  ): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    expect(res.statusCode).toBe(200);
    return res.json().token as string;
  }

  it('enforces role authorization on GET /coordination/active-movements (401 unauthenticated, 403 teacher, 200 coordinator/admin)', async () => {
    const { app } = await createApp();

    // 1. Unauthenticated request -> 401
    const unauthRes = await app.inject({
      method: 'GET',
      url: '/coordination/active-movements',
    });
    expect(unauthRes.statusCode).toBe(401);

    // 2. Teacher request -> 403 Forbidden
    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const teacherRes = await app.inject({
      method: 'GET',
      url: '/coordination/active-movements',
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(teacherRes.statusCode).toBe(403);
    expect(teacherRes.json()).toMatchObject({
      error: 'Acesso negado para o perfil atual.',
    });

    // 3. Coordinator request -> 200 OK
    const coordToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );
    const coordRes = await app.inject({
      method: 'GET',
      url: '/coordination/active-movements',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(coordRes.statusCode).toBe(200);
    expect(coordRes.json()).toHaveProperty('movements');
    expect(Array.isArray(coordRes.json().movements)).toBe(true);

    // 4. Admin request -> 200 OK
    const adminToken = await loginAs(
      app,
      'admin@linsdorego.edu.br',
      'admin123',
    );
    const adminRes = await app.inject({
      method: 'GET',
      url: '/coordination/active-movements',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(adminRes.statusCode).toBe(200);
    expect(Array.isArray(adminRes.json().movements)).toBe(true);
  });

  it('lists active student exits across all classrooms with calculated elapsed time, alert level and filters', async () => {
    let currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const coordToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    // Start Session 1 in Room 01 (1A)
    const session1Res = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        classCode: '1A',
        subject: 'Matemática',
        roomId: 'SALA-01',
        defaultTimeLimitMinutes: 10,
      },
    });
    const session1Id = session1Res.json().session.id as string;

    // Exit student in Session 1
    const exit1Res = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session1Id },
    });
    expect(exit1Res.statusCode).toBe(201);
    const movement1Id = exit1Res.json().movement.id as string;

    // Advance clock by 9 minutes -> 9/10 = 90% (YELLOW alert)
    currentTime = new Date('2026-03-10T08:09:00.000Z');

    // Query coordination panel
    const listRes = await app.inject({
      method: 'GET',
      url: '/coordination/active-movements',
      headers: { authorization: `Bearer ${coordToken}` },
    });

    expect(listRes.statusCode).toBe(200);
    const movements = listRes.json().movements;
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      id: movement1Id,
      studentRa: '1001',
      studentPublicName: 'Lucas S.',
      classCode: '1A',
      status: MovementStatus.IN_TRANSIT,
      alertLevel: AlertLevel.YELLOW,
      elapsedMinutes: 9,
    });

    // Escalate movement
    const escalateRes = await app.inject({
      method: 'POST',
      url: `/movements/${movement1Id}/escalate`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { notes: 'Atrasado, escalado para coordenação.' },
    });
    expect(escalateRes.statusCode).toBe(200);

    // Filter by status=ESCALATED_TO_COORDINATION
    const escalatedListRes = await app.inject({
      method: 'GET',
      url: '/coordination/active-movements?status=ESCALATED_TO_COORDINATION',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(escalatedListRes.statusCode).toBe(200);
    expect(escalatedListRes.json().movements).toHaveLength(1);
    expect(escalatedListRes.json().movements[0].status).toBe(
      MovementStatus.ESCALATED_TO_COORDINATION,
    );
    expect(escalatedListRes.json().movements[0].alertLevel).toBe(
      AlertLevel.RED,
    );

    // Filter by classCode=2B should return empty
    const otherClassRes = await app.inject({
      method: 'GET',
      url: '/coordination/active-movements?classCode=2B',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(otherClassRes.statusCode).toBe(200);
    expect(otherClassRes.json().movements).toHaveLength(0);
  });

  it('broadcasts real-time events to the coordination channel when movements exit, return, and escalate', async () => {
    const currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });

    const exitSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementExit',
    );
    const returnSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementReturn',
    );
    const escalateSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementEscalated',
    );

    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );

    const sessionRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { classCode: '1A', subject: 'Matemática', roomId: 'SALA-01' },
    });
    const sessionId = sessionRes.json().session.id as string;

    // Student exits
    const exitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId },
    });
    expect(exitRes.statusCode).toBe(201);
    const movId = exitRes.json().movement.id as string;
    expect(exitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: movId,
        studentPublicName: 'Lucas S.',
        status: MovementStatus.IN_TRANSIT,
      }),
    );

    // Escalate
    await app.inject({
      method: 'POST',
      url: `/movements/${movId}/escalate`,
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(escalateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: movId,
        status: MovementStatus.ESCALATED_TO_COORDINATION,
      }),
    );

    // Student returns
    const returnRes = await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001', sessionId },
    });
    expect(returnRes.statusCode).toBe(200);
    expect(returnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: movId,
        status: MovementStatus.RETURNED_NORMAL,
      }),
    );
  });
});
