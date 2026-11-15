import { createApp } from '@server/main/app';
import { IncidentOutcome, MovementStatus } from '@shared/enums';
import { describe, expect, it, vi } from 'vitest';

describe('Controller Seam: Movement Resolution & Saída em Trânsito (app.inject)', () => {
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

  it('automatically transitions active and overdue movements to IN_TRANSIT_UNRESOLVED on POST /sessions/end', async () => {
    let currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });
    const spyInTransitNotify = vi.spyOn(
      container.notificationSender,
      'notifyMovementInTransitUnresolved',
    );

    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );

    // 1. Start session
    const startRes = await app.inject({
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
    expect(startRes.statusCode).toBe(201);
    const { session } = startRes.json();

    // 2. Student exits room (RA 1001)
    const exitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: {
        ra: '1001',
        sessionId: session.id,
      },
    });
    expect(exitRes.statusCode).toBe(201);
    const { movement } = exitRes.json();
    expect(movement.status).toBe(MovementStatus.IN_TRANSIT);

    // 3. 50 minutes pass (lesson finishes while student is still out)
    currentTime = new Date('2026-03-10T08:50:00.000Z');

    // 4. End session
    const endRes = await app.inject({
      method: 'POST',
      url: '/sessions/end',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        sessionId: session.id,
      },
    });

    expect(endRes.statusCode).toBe(200);
    const endBody = endRes.json();
    expect(endBody.metrics.inTransitUnresolvedCount).toBe(1);
    expect(endBody.inTransitMovements).toHaveLength(1);
    expect(endBody.inTransitMovements[0]).toMatchObject({
      id: movement.id,
      status: MovementStatus.IN_TRANSIT_UNRESOLVED,
      studentRa: '1001',
      studentPublicName: 'Lucas S.',
      classCode: '1A',
    });

    expect(spyInTransitNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        id: movement.id,
        status: MovementStatus.IN_TRANSIT_UNRESOLVED,
      }),
    );

    // 5. Check that coordination can see this movement under active-movements
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
    const inTransitMov = coordRes
      .json()
      .movements.find((m: { id: string }) => m.id === movement.id);
    expect(inTransitMov).toBeDefined();
    expect(inTransitMov.status).toBe(MovementStatus.IN_TRANSIT_UNRESOLVED);

    await app.close();
  });

  it('enforces authentication and coordinator/admin authorization on POST /coordination/movements/:id/resolve', async () => {
    const { app } = await createApp();

    // 1. Unauthenticated -> 401
    const unauthRes = await app.inject({
      method: 'POST',
      url: '/coordination/movements/mov-123/resolve',
      payload: { outcome: IncidentOutcome.RETURNED_TO_CLASS },
    });
    expect(unauthRes.statusCode).toBe(401);

    // 2. Teacher -> 403 Forbidden
    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const teacherRes = await app.inject({
      method: 'POST',
      url: '/coordination/movements/mov-123/resolve',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { outcome: IncidentOutcome.RETURNED_TO_CLASS },
    });
    expect(teacherRes.statusCode).toBe(403);

    // 3. Non-existent movement with Coordinator auth -> 404
    const coordToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );
    const notFoundRes = await app.inject({
      method: 'POST',
      url: '/coordination/movements/mov-non-existent/resolve',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { outcome: IncidentOutcome.RETURNED_TO_CLASS },
    });
    expect(notFoundRes.statusCode).toBe(404);

    await app.close();
  });

  it('resolves incidents with each outcome type, validates payload, and broadcasts events', async () => {
    let currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });
    const spyResolveNotify = vi.spyOn(
      container.notificationSender,
      'notifyMovementResolved',
    );

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

    // Outcomes to verify
    const testCases: Array<{
      ra: string;
      outcome: IncidentOutcome;
      notes: string;
    }> = [
      {
        ra: '1001',
        outcome: IncidentOutcome.RETURNED_TO_CLASS,
        notes: 'Aluno retornou para a sala de aula.',
      },
      {
        ra: '1002',
        outcome: IncidentOutcome.ATTENDED_AT_COORDINATION,
        notes: 'Aluno orientado pela coordenação.',
      },
      {
        ra: '1003',
        outcome: IncidentOutcome.SENT_TO_INFIRMARY,
        notes: 'Aluno encaminhado à enfermaria escolar.',
      },
      {
        ra: '2001',
        outcome: IncidentOutcome.EVASION,
        notes: 'Aluno evadiu das dependências escolares.',
      },
    ];

    for (let i = 0; i < testCases.length; i++) {
      const { ra, outcome, notes } = testCases[i];
      const roomId = `SALA-${i + 1}`;

      // Start session
      const startRes = await app.inject({
        method: 'POST',
        url: '/sessions/start',
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          classCode: '1A',
          subject: 'Matemática',
          roomId,
        },
      });
      const sessionId = startRes.json().session.id;

      // Student exit (use emergency or guest if 2001)
      const exitRes =
        ra === '2001'
          ? await app.inject({
              method: 'POST',
              url: '/movements/guest-exit',
              headers: { authorization: `Bearer ${teacherToken}` },
              payload: {
                ra,
                sessionId,
                fullName: 'Pedro Alves',
                originClassCode: '2B',
              },
            })
          : await app.inject({
              method: 'POST',
              url: '/movements/exit',
              payload: { ra, sessionId },
            });

      expect(exitRes.statusCode).toBe(201);
      const movementId = exitRes.json().movement.id;

      // Escalate to coordination
      await app.inject({
        method: 'POST',
        url: `/movements/${movementId}/escalate`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: { notes: 'Atraso detectado' },
      });

      // Test invalid outcome rejection (400) on first case
      if (i === 0) {
        const invalidRes = await app.inject({
          method: 'POST',
          url: `/coordination/movements/${movementId}/resolve`,
          headers: { authorization: `Bearer ${coordToken}` },
          payload: { outcome: 'INVALID_OUTCOME' },
        });
        expect(invalidRes.statusCode).toBe(400);
      }

      // Advance clock
      currentTime = new Date('2026-03-10T08:35:00.000Z');

      // Resolve movement
      const resolveRes = await app.inject({
        method: 'POST',
        url: `/coordination/movements/${movementId}/resolve`,
        headers: { authorization: `Bearer ${coordToken}` },
        payload: { outcome, notes },
      });

      expect(resolveRes.statusCode).toBe(200);
      const resolveBody = resolveRes.json();
      expect(resolveBody.movement).toMatchObject({
        id: movementId,
        status: MovementStatus.RESOLVED,
        outcome,
        resolutionNotes: notes,
        resolvedByCoordinatorId: expect.any(String),
      });

      expect(spyResolveNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          id: movementId,
          status: MovementStatus.RESOLVED,
          outcome,
        }),
      );
    }

    await app.close();
  });
});
