import { createApp } from '@server/main/app';
import { IncidentOutcome, MovementStatus } from '@shared/enums';
import { describe, expect, it, vi } from 'vitest';

describe('Controller Seam: Inactive Student Guards & Historical Class Snapshot (app.inject)', () => {
  async function loginAs(
    app: Awaited<ReturnType<typeof createApp>>['app'],
    email: string,
    password = 'senha123',
  ): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    expect(res.statusCode).toBe(200);
    return (res.json() as { token: string }).token;
  }

  async function startActiveSession(
    app: Awaited<ReturnType<typeof createApp>>['app'],
    teacherToken: string,
    classCode = '1A',
    subject = 'Matemática',
    roomId = 'SALA-01',
  ) {
    const startRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { classCode, subject, roomId },
    });
    expect(startRes.statusCode).toBe(201);
    return startRes.json().session as { id: string; classCode: string };
  }

  async function deactivateStudent(
    app: Awaited<ReturnType<typeof createApp>>['app'],
    coordinatorToken: string,
    studentId: string,
  ) {
    const res = await app.inject({
      method: 'PATCH',
      url: `/students/${studentId}/status`,
      headers: { authorization: `Bearer ${coordinatorToken}` },
      payload: { isActive: false },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().student.isActive).toBe(false);
  }

  it('blocks an inactive student with HTTP 403 when requesting a normal exit (POST /movements/exit)', async () => {
    const currentTime = new Date('2026-03-15T09:00:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });
    const notifyExitSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementExit',
    );

    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const coordinatorToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    const session = await startActiveSession(app, teacherToken, '1A');
    await deactivateStudent(app, coordinatorToken, 'student-1');

    const exitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: {
        ra: '1001',
        sessionId: session.id,
      },
    });

    expect(exitRes.statusCode).toBe(403);
    expect(exitRes.json()).toMatchObject({
      error: expect.stringMatching(/inativ/i),
    });
    expect(notifyExitSpy).not.toHaveBeenCalled();

    await app.close();
  });

  it('blocks an inactive student with HTTP 403 when trying to enter the waiting queue (POST /movements/queue)', async () => {
    const currentTime = new Date('2026-03-15T09:10:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const coordinatorToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    const session = await startActiveSession(app, teacherToken, '1A');

    // Occupy the room with RA 1001
    const firstExit = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(firstExit.statusCode).toBe(201);

    // Deactivate student-2 (RA 1002)
    await deactivateStudent(app, coordinatorToken, 'student-2');

    // Inactive student tries to enqueue -> 403
    const enqueueRes = await app.inject({
      method: 'POST',
      url: '/movements/queue',
      payload: { ra: '1002', sessionId: session.id },
    });
    expect(enqueueRes.statusCode).toBe(403);
    expect(enqueueRes.json()).toMatchObject({
      error: expect.stringMatching(/inativ/i),
    });

    await app.close();
  });

  it('blocks a student deactivated while waiting in queue with HTTP 403 when claiming the called slot (POST /movements/queue/claim)', async () => {
    let currentTime = new Date('2026-03-15T09:20:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const coordinatorToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    const session = await startActiveSession(app, teacherToken, '1A');

    // RA 1001 exits
    const firstExit = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(firstExit.statusCode).toBe(201);

    // RA 1002 enters queue while still active
    const enqueueRes = await app.inject({
      method: 'POST',
      url: '/movements/queue',
      payload: { ra: '1002', sessionId: session.id },
    });
    expect(enqueueRes.statusCode).toBe(201);

    // Coordination deactivates RA 1002 while in queue
    await deactivateStudent(app, coordinatorToken, 'student-2');

    // RA 1001 returns, calling RA 1002's slot
    currentTime = new Date('2026-03-15T09:25:00.000Z');
    const returnRes = await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(returnRes.statusCode).toBe(200);

    // Now deactivated RA 1002 tries to claim the slot -> 403
    currentTime = new Date('2026-03-15T09:25:30.000Z');
    const claimRes = await app.inject({
      method: 'POST',
      url: '/movements/queue/claim',
      payload: { ra: '1002', sessionId: session.id },
    });
    expect(claimRes.statusCode).toBe(403);
    expect(claimRes.json()).toMatchObject({
      error: expect.stringMatching(/inativ/i),
    });

    await app.close();
  });

  it('blocks an inactive student with HTTP 403 in emergency exit (POST /movements/emergency)', async () => {
    const currentTime = new Date('2026-03-15T09:30:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const coordinatorToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    const session = await startActiveSession(app, teacherToken, '1A');
    await deactivateStudent(app, coordinatorToken, 'student-1');

    const emergencyRes = await app.inject({
      method: 'POST',
      url: '/movements/emergency',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        ra: '1001',
        sessionId: session.id,
        reason: 'Mal-estar súbito',
      },
    });

    expect(emergencyRes.statusCode).toBe(403);
    expect(emergencyRes.json()).toMatchObject({
      error: expect.stringMatching(/inativ/i),
    });

    await app.close();
  });

  it('blocks an existing inactive student with HTTP 403 in guest authorization (POST /movements/guest-exit)', async () => {
    const currentTime = new Date('2026-03-15T09:40:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const coordinatorToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    const session = await startActiveSession(app, teacherToken, '1A');

    // Deactivate student-4 (RA 2001, class 2B)
    await deactivateStudent(app, coordinatorToken, 'student-4');

    const guestRes = await app.inject({
      method: 'POST',
      url: '/movements/guest-exit',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        ra: '2001',
        sessionId: session.id,
      },
    });

    expect(guestRes.statusCode).toBe(403);
    expect(guestRes.json()).toMatchObject({
      error: expect.stringMatching(/inativ/i),
    });

    await app.close();
  });

  it('preserves old classCode snapshot in history after Turma transfer (1A -> 1B) and requires new Turma for normal exits', async () => {
    let currentTime = new Date('2026-03-15T10:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const coordinatorToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    // 1. Student RA 1001 exits and returns while in Turma 1A
    const session1A = await startActiveSession(app, teacherToken, '1A');
    const firstExit = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session1A.id },
    });
    expect(firstExit.statusCode).toBe(201);
    const firstMovementId = firstExit.json().movement.id as string;

    currentTime = new Date('2026-03-15T10:05:00.000Z');
    const firstReturn = await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001', sessionId: session1A.id },
    });
    expect(firstReturn.statusCode).toBe(200);

    // 2. Coordination transfers student-1 from 1A to 1B
    currentTime = new Date('2026-03-15T10:10:00.000Z');
    const transferRes = await app.inject({
      method: 'PATCH',
      url: '/students/student-1',
      headers: { authorization: `Bearer ${coordinatorToken}` },
      payload: { classGroupId: 'class-2026-1b' },
    });
    expect(transferRes.statusCode).toBe(200);
    expect(transferRes.json().student).toMatchObject({
      ra: '1001',
      classGroupId: 'class-2026-1b',
      classCode: '1B',
    });

    // 3. Trying normal exit in old Turma 1A is now rejected with 403
    const oldClassExit = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session1A.id },
    });
    expect(oldClassExit.statusCode).toBe(403);
    expect(oldClassExit.json()).toMatchObject({
      error: expect.stringMatching(/1B.*1A|turma/i),
    });

    // 4. End 1A session, start 1B session, and exit in 1B succeeds
    const end1ARes = await app.inject({
      method: 'POST',
      url: '/sessions/end',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { sessionId: session1A.id },
    });
    expect(end1ARes.statusCode).toBe(200);

    currentTime = new Date('2026-03-15T10:15:00.000Z');
    const session1B = await startActiveSession(app, teacherToken, '1B');
    const newClassExit = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session1B.id },
    });
    expect(newClassExit.statusCode).toBe(201);
    const secondMovementId = newClassExit.json().movement.id as string;
    expect(newClassExit.json().movement.classCode).toBe('1B');

    currentTime = new Date('2026-03-15T10:19:00.000Z');
    const secondReturn = await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001', sessionId: session1B.id },
    });
    expect(secondReturn.statusCode).toBe(200);

    // 5. Student History Report reflects current classCode '1B' while preserving '1A' on the historical movement
    const historyRes = await app.inject({
      method: 'GET',
      url: '/analytics/students/1001',
      headers: { authorization: `Bearer ${coordinatorToken}` },
    });
    expect(historyRes.statusCode).toBe(200);
    const report = historyRes.json() as {
      student: { ra: string; classCode: string };
      history: Array<{ id: string; classCode: string }>;
    };
    expect(report.student.classCode).toBe('1B');
    expect(report.history).toHaveLength(2);

    const historicalRecord = report.history.find(
      (m) => m.id === firstMovementId,
    );
    const newRecord = report.history.find((m) => m.id === secondMovementId);
    expect(historicalRecord?.classCode).toBe('1A');
    expect(newRecord?.classCode).toBe('1B');

    await app.close();
  });

  it('allows returning an open IN_TRANSIT exit even after the student is deactivated and transferred', async () => {
    let currentTime = new Date('2026-03-15T12:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const coordinatorToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    const session = await startActiveSession(app, teacherToken, '1A');

    // Student RA 1001 exits while active in 1A
    const exitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(exitRes.statusCode).toBe(201);

    // Coordination transfers student-1 to 1B and deactivates them while IN_TRANSIT
    const transferRes = await app.inject({
      method: 'PATCH',
      url: '/students/student-1',
      headers: { authorization: `Bearer ${coordinatorToken}` },
      payload: { classGroupId: 'class-2026-1b' },
    });
    expect(transferRes.statusCode).toBe(200);
    await deactivateStudent(app, coordinatorToken, 'student-1');

    // Student can still register return without error, preserving 1A snapshot
    currentTime = new Date('2026-03-15T12:06:00.000Z');
    const returnRes = await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(returnRes.statusCode).toBe(200);
    expect(returnRes.json().movement).toMatchObject({
      studentRa: '1001',
      classCode: '1A',
      status: MovementStatus.RETURNED_NORMAL,
    });

    await app.close();
  });

  it('allows Coordination to resolve ESCALATED_TO_COORDINATION and IN_TRANSIT_UNRESOLVED incidents after student deactivation or transfer', async () => {
    let currentTime = new Date('2026-03-15T13:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const coordinatorToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    const session = await startActiveSession(app, teacherToken, '1A');

    // RA 1001 exits and is escalated to Coordination
    const exit1 = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId: session.id },
    });
    expect(exit1.statusCode).toBe(201);
    const escalatedMovementId = exit1.json().movement.id as string;

    const escalateRes = await app.inject({
      method: 'POST',
      url: `/movements/${escalatedMovementId}/escalate`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { notes: 'Aluno demorou para retornar' },
    });
    expect(escalateRes.statusCode).toBe(200);
    expect(escalateRes.json().movement.status).toBe(
      MovementStatus.ESCALATED_TO_COORDINATION,
    );

    // RA 1002 exits via emergency while session is active, then session ends -> IN_TRANSIT_UNRESOLVED
    const exit2 = await app.inject({
      method: 'POST',
      url: '/movements/emergency',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { ra: '1002', sessionId: session.id, reason: 'Enfermaria' },
    });
    expect(exit2.statusCode).toBe(201);
    const unresolvedMovementId = exit2.json().movement.id as string;

    currentTime = new Date('2026-03-15T13:20:00.000Z');
    const endSessionRes = await app.inject({
      method: 'POST',
      url: '/sessions/end',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { sessionId: session.id },
    });
    expect(endSessionRes.statusCode).toBe(200);

    // Deactivate both students and transfer student-1 to 1B
    await app.inject({
      method: 'PATCH',
      url: '/students/student-1',
      headers: { authorization: `Bearer ${coordinatorToken}` },
      payload: { classGroupId: 'class-2026-1b' },
    });
    await deactivateStudent(app, coordinatorToken, 'student-1');
    await deactivateStudent(app, coordinatorToken, 'student-2');

    // Coordination resolves both incidents cleanly
    currentTime = new Date('2026-03-15T13:25:00.000Z');
    const resolveEscalated = await app.inject({
      method: 'POST',
      url: `/coordination/movements/${escalatedMovementId}/resolve`,
      headers: { authorization: `Bearer ${coordinatorToken}` },
      payload: {
        outcome: IncidentOutcome.ATTENDED_AT_COORDINATION,
        notes: 'Atendido pela coordenação',
      },
    });
    expect(resolveEscalated.statusCode).toBe(200);
    expect(resolveEscalated.json().movement).toMatchObject({
      id: escalatedMovementId,
      classCode: '1A',
      status: MovementStatus.RESOLVED,
      outcome: IncidentOutcome.ATTENDED_AT_COORDINATION,
    });

    const resolveUnresolved = await app.inject({
      method: 'POST',
      url: `/coordination/movements/${unresolvedMovementId}/resolve`,
      headers: { authorization: `Bearer ${coordinatorToken}` },
      payload: {
        outcome: IncidentOutcome.SENT_TO_INFIRMARY,
        notes: 'Encaminhado à enfermaria',
      },
    });
    expect(resolveUnresolved.statusCode).toBe(200);
    expect(resolveUnresolved.json().movement).toMatchObject({
      id: unresolvedMovementId,
      classCode: '1A',
      status: MovementStatus.RESOLVED,
      outcome: IncidentOutcome.SENT_TO_INFIRMARY,
    });

    await app.close();
  });
});
