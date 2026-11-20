import { User } from '@server/domain/entities/User';
import { hashPassword } from '@server/infrastructure/repositories/InMemoryUserRepository';
import { createApp } from '@server/main/app';
import { SessionStatus, UserRole } from '@shared/enums';
import { describe, expect, it } from 'vitest';

describe('Controller Seam: ClassSession Lifecycle Endpoints (app.inject)', () => {
  async function loginAs(
    app: Awaited<ReturnType<typeof createApp>>['app'],
    email: string,
    password: string,
  ) {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    expect(res.statusCode).toBe(200);
    return res.json() as { token: string; user: { id: string; name: string } };
  }

  async function loginAsTeacher(
    app: Awaited<ReturnType<typeof createApp>>['app'],
  ) {
    return loginAs(app, 'prof@linsdorego.edu.br', 'senha123');
  }

  it('starts a class session via POST /sessions/start and retrieves it via GET /sessions/active', async () => {
    const currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });
    const { token, user } = await loginAsTeacher(app);

    // Initially no active session
    const initialActiveRes = await app.inject({
      method: 'GET',
      url: '/sessions/active?roomId=SALA-01',
    });
    expect(initialActiveRes.statusCode).toBe(200);
    expect(initialActiveRes.json().session).toBeNull();

    // Start a session for Turma 1A - Matemática
    const startRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        classCode: '1A',
        subject: 'Matemática',
        roomId: 'SALA-01',
      },
    });

    expect(startRes.statusCode).toBe(201);
    const startBody = startRes.json();
    expect(startBody.session).toMatchObject({
      id: expect.any(String),
      teacherId: user.id,
      teacherName: user.name,
      roomId: 'SALA-01',
      classCode: '1A',
      subject: 'Matemática',
      status: SessionStatus.ACTIVE,
      startedAt: '2026-03-10T08:00:00.000Z',
      plannedDurationMinutes: 50,
      defaultTimeLimitMinutes: 10,
    });

    // Query active session for SALA-01
    const activeRes = await app.inject({
      method: 'GET',
      url: '/sessions/active?roomId=SALA-01',
    });
    expect(activeRes.statusCode).toBe(200);
    expect(activeRes.json().session).toMatchObject({
      id: startBody.session.id,
      classCode: '1A',
      subject: 'Matemática',
      status: SessionStatus.ACTIVE,
    });

    await app.close();
  });

  it('enforces strict room and teacher concurrency locks (HTTP 409) and isolates active sessions by roomId', async () => {
    const currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });

    await container.userRepo.save(
      User.create({
        id: 'teacher-2',
        name: 'Profa. Beatriz Nogueira',
        email: 'beatriz@linsdorego.edu.br',
        passwordHash: hashPassword('senha123'),
        role: UserRole.TEACHER,
        pinCode: '5678',
      }),
    );

    const teacherA = await loginAsTeacher(app);
    const teacherB = await loginAs(
      app,
      'beatriz@linsdorego.edu.br',
      'senha123',
    );

    const firstRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: {
        authorization: `Bearer ${teacherA.token}`,
      },
      payload: {
        classCode: '1A',
        subject: 'Matemática',
        roomId: 'SALA-01',
      },
    });
    expect(firstRes.statusCode).toBe(201);
    const sessionA = firstRes.json().session;

    // Another teacher attempting to start a session in the same room (SALA-01) -> 409 Conflict
    const roomConflictRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: {
        authorization: `Bearer ${teacherB.token}`,
      },
      payload: {
        classCode: '2B',
        subject: 'História',
        roomId: 'SALA-01',
      },
    });
    expect(roomConflictRes.statusCode).toBe(409);
    expect(roomConflictRes.json()).toMatchObject({
      error: expect.stringMatching(/sessão.*ativa/i),
    });

    // Same teacher attempting to start a second session in another room (SALA-02) -> 409 Conflict
    const teacherConflictRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: {
        authorization: `Bearer ${teacherA.token}`,
      },
      payload: {
        classCode: '2B',
        subject: 'História',
        roomId: 'SALA-02',
      },
    });
    expect(teacherConflictRes.statusCode).toBe(409);
    expect(teacherConflictRes.json()).toMatchObject({
      error: expect.stringMatching(/professor.*sessão.*ativa/i),
    });

    // Different teacher starting a session in a different room (SALA-02) succeeds
    const otherRoomRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: {
        authorization: `Bearer ${teacherB.token}`,
      },
      payload: {
        classCode: '2B',
        subject: 'História',
        roomId: 'sala-02',
      },
    });
    expect(otherRoomRes.statusCode).toBe(201);
    const sessionB = otherRoomRes.json().session;
    expect(sessionB.roomId).toBe('SALA-02');

    // GET /sessions/active strictly filters by normalized roomId
    const activeRoom1 = await app.inject({
      method: 'GET',
      url: '/sessions/active?roomId=sala-01',
    });
    expect(activeRoom1.statusCode).toBe(200);
    expect(activeRoom1.json().session?.id).toBe(sessionA.id);

    const activeRoom2 = await app.inject({
      method: 'GET',
      url: '/sessions/active?roomId=SALA-02',
    });
    expect(activeRoom2.statusCode).toBe(200);
    expect(activeRoom2.json().session?.id).toBe(sessionB.id);

    const activeRoom3 = await app.inject({
      method: 'GET',
      url: '/sessions/active?roomId=SALA-03',
    });
    expect(activeRoom3.statusCode).toBe(200);
    expect(activeRoom3.json().session).toBeNull();

    // After Teacher A ends their session in SALA-01, Teacher A can start a new session in SALA-03
    const endA = await app.inject({
      method: 'POST',
      url: '/sessions/end',
      headers: { authorization: `Bearer ${teacherA.token}` },
      payload: { sessionId: sessionA.id },
    });
    expect(endA.statusCode).toBe(200);

    const teacherANewRoom = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacherA.token}` },
      payload: {
        classCode: '3B',
        subject: 'Geografia',
        roomId: 'SALA-03',
      },
    });
    expect(teacherANewRoom.statusCode).toBe(201);

    await app.close();
  });

  it('rejects starting a session in a non-existent or inactive room (HTTP 400)', async () => {
    const currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });
    const teacher = await loginAsTeacher(app);
    const coord = await loginAs(app, 'coord@linsdorego.edu.br', 'coord123');

    // Non-existent room -> 400
    const unknownRoomRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacher.token}` },
      payload: {
        classCode: '1A',
        subject: 'Matemática',
        roomId: 'SALA-99',
      },
    });
    expect(unknownRoomRes.statusCode).toBe(400);
    expect(unknownRoomRes.json()).toMatchObject({
      error: expect.stringMatching(/SALA-99/i),
    });

    // Deactivate SALA-03 via coordination endpoint
    const deactivateRes = await app.inject({
      method: 'PATCH',
      url: '/rooms/room-sala-03/status',
      headers: { authorization: `Bearer ${coord.token}` },
      payload: { isActive: false },
    });
    expect(deactivateRes.statusCode).toBe(200);

    // Inactive room -> 400
    const inactiveRoomRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacher.token}` },
      payload: {
        classCode: '1A',
        subject: 'Matemática',
        roomId: 'sala-03',
      },
    });
    expect(inactiveRoomRes.statusCode).toBe(400);
    expect(inactiveRoomRes.json()).toMatchObject({
      error: expect.stringMatching(/inativa/i),
    });

    await app.close();
  });

  it('ends an active session via POST /sessions/end, consolidates lesson metrics, and allows starting a new session afterwards', async () => {
    let currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });
    const { token } = await loginAsTeacher(app);

    const startRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        classCode: '3A',
        subject: 'Física',
        roomId: 'SALA-01',
      },
    });
    expect(startRes.statusCode).toBe(201);
    const { session: startedSession } = startRes.json();

    // Advance clock by 50 minutes (bell rings)
    currentTime = new Date('2026-03-10T08:50:00.000Z');

    const endRes = await app.inject({
      method: 'POST',
      url: '/sessions/end',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        sessionId: startedSession.id,
      },
    });

    expect(endRes.statusCode).toBe(200);
    const endBody = endRes.json();
    expect(endBody.session).toMatchObject({
      id: startedSession.id,
      classCode: '3A',
      subject: 'Física',
      status: SessionStatus.ENDED,
      startedAt: '2026-03-10T08:00:00.000Z',
      endedAt: '2026-03-10T08:50:00.000Z',
    });
    expect(endBody.metrics).toMatchObject({
      totalExits: 0,
      inTransitUnresolvedCount: 0,
      elapsedMinutes: 50,
    });

    // Active session for SALA-01 is now null
    const activeAfterEnd = await app.inject({
      method: 'GET',
      url: '/sessions/active?roomId=SALA-01',
    });
    expect(activeAfterEnd.statusCode).toBe(200);
    expect(activeAfterEnd.json().session).toBeNull();

    // Ending again when no session is active returns 404
    const secondEndRes = await app.inject({
      method: 'POST',
      url: '/sessions/end',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        roomId: 'SALA-01',
      },
    });
    expect(secondEndRes.statusCode).toBe(404);

    // Starting the next class session in SALA-01 now succeeds
    currentTime = new Date('2026-03-10T08:52:00.000Z');
    const nextStartRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        classCode: '1B',
        subject: 'Química',
        roomId: 'SALA-01',
      },
    });
    expect(nextStartRes.statusCode).toBe(201);

    await app.close();
  });

  it('links ClassSession to ClassGroup via classGroupId and rejects unknown or inactive Turmas (HTTP 400)', async () => {
    const currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });
    const teacher = await loginAsTeacher(app);
    const coord = await loginAs(app, 'coord@linsdorego.edu.br', 'coord123');

    // Unknown classCode -> 400
    const unknownCodeRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacher.token}` },
      payload: {
        classCode: '9Z',
        subject: 'Matemática',
        roomId: 'SALA-01',
      },
    });
    expect(unknownCodeRes.statusCode).toBe(400);
    expect(unknownCodeRes.json()).toMatchObject({
      error: expect.stringMatching(/turma.*9Z/i),
    });

    // Unknown classGroupId -> 400
    const unknownIdRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacher.token}` },
      payload: {
        classGroupId: 'non-existent-class-id',
        subject: 'Matemática',
        roomId: 'SALA-01',
      },
    });
    expect(unknownIdRes.statusCode).toBe(400);

    // Deactivate 3B via coordination endpoint
    const deactivateRes = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-3b/status',
      headers: { authorization: `Bearer ${coord.token}` },
      payload: { isActive: false },
    });
    expect(deactivateRes.statusCode).toBe(200);

    // Inactive Turma by classGroupId -> 400
    const inactiveByIdRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacher.token}` },
      payload: {
        classGroupId: 'class-2026-3b',
        subject: 'Biologia',
        roomId: 'SALA-01',
      },
    });
    expect(inactiveByIdRes.statusCode).toBe(400);
    expect(inactiveByIdRes.json()).toMatchObject({
      error: expect.stringMatching(/inativa/i),
    });

    // Inactive Turma by classCode -> 400
    const inactiveByCodeRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacher.token}` },
      payload: {
        classCode: '3B',
        subject: 'Biologia',
        roomId: 'SALA-01',
      },
    });
    expect(inactiveByCodeRes.statusCode).toBe(400);
    expect(inactiveByCodeRes.json()).toMatchObject({
      error: expect.stringMatching(/inativa/i),
    });

    // Starting by classGroupId for active Turma succeeds and populates classGroupId + classCode
    const validByIdRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacher.token}` },
      payload: {
        classGroupId: 'class-2026-2a',
        subject: 'História',
        roomId: 'SALA-01',
      },
    });
    expect(validByIdRes.statusCode).toBe(201);
    expect(validByIdRes.json().session).toMatchObject({
      classGroupId: 'class-2026-2a',
      classCode: '2A',
      roomId: 'SALA-01',
      subject: 'História',
      status: SessionStatus.ACTIVE,
    });

    await app.close();
  });

  it('enforces the 3rd strict concurrency lock by Turma (HTTP 409) across rooms and releases it when the session ends', async () => {
    const currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app, container } = await createApp({ clock: () => currentTime });

    await container.userRepo.save(
      User.create({
        id: 'teacher-2',
        name: 'Profa. Beatriz Nogueira',
        email: 'beatriz@linsdorego.edu.br',
        passwordHash: hashPassword('senha123'),
        role: UserRole.TEACHER,
        pinCode: '5678',
      }),
    );

    const teacherA = await loginAsTeacher(app);
    const teacherB = await loginAs(
      app,
      'beatriz@linsdorego.edu.br',
      'senha123',
    );

    // Teacher A starts session for Turma 1A in SALA-01
    const startARes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacherA.token}` },
      payload: {
        classGroupId: 'class-2026-1a',
        subject: 'Matemática',
        roomId: 'SALA-01',
      },
    });
    expect(startARes.statusCode).toBe(201);
    const sessionA = startARes.json().session;
    expect(sessionA.classGroupId).toBe('class-2026-1a');

    // Teacher B tries to start session for the same Turma 1A in LAB-01 -> 409 Conflict
    const classConflictRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacherB.token}` },
      payload: {
        classGroupId: 'class-2026-1a',
        subject: 'Física',
        roomId: 'LAB-01',
      },
    });
    expect(classConflictRes.statusCode).toBe(409);
    expect(classConflictRes.json()).toMatchObject({
      error: expect.stringMatching(/turma.*1A.*ativa/i),
    });

    // Also rejects via legacy classCode payload -> 409 Conflict
    const classConflictByCodeRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacherB.token}` },
      payload: {
        classCode: '1A',
        subject: 'Física',
        roomId: 'LAB-01',
      },
    });
    expect(classConflictByCodeRes.statusCode).toBe(409);

    // End Teacher A's session
    const endARes = await app.inject({
      method: 'POST',
      url: '/sessions/end',
      headers: { authorization: `Bearer ${teacherA.token}` },
      payload: { sessionId: sessionA.id },
    });
    expect(endARes.statusCode).toBe(200);

    // Now Teacher B can start a session for Turma 1A in LAB-01 -> 201
    const retryRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacherB.token}` },
      payload: {
        classGroupId: 'class-2026-1a',
        subject: 'Física',
        roomId: 'LAB-01',
      },
    });
    expect(retryRes.statusCode).toBe(201);
    expect(retryRes.json().session).toMatchObject({
      classGroupId: 'class-2026-1a',
      classCode: '1A',
      roomId: 'LAB-01',
    });

    await app.close();
  });
});
