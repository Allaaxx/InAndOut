import { describe, it, expect } from 'vitest';
import { createApp } from '@server/main/app';
import { SessionStatus } from '@shared/enums';

describe('Controller Seam: ClassSession Lifecycle Endpoints (app.inject)', () => {
  async function loginAsTeacher(app: Awaited<ReturnType<typeof createApp>>['app']) {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'prof@linsdorego.edu.br',
        password: 'senha123',
      },
    });
    expect(res.statusCode).toBe(200);
    return res.json() as { token: string; user: { id: string; name: string } };
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

  it('enforces that only one class session can be active per room/terminal simultaneously (HTTP 409)', async () => {
    const currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });
    const { token } = await loginAsTeacher(app);

    const firstRes = await app.inject({
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
    expect(firstRes.statusCode).toBe(201);

    // Attempting to start a second session on the same terminal/room returns 409 Conflict
    const conflictRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        classCode: '2B',
        subject: 'História',
        roomId: 'SALA-01',
      },
    });
    expect(conflictRes.statusCode).toBe(409);
    expect(conflictRes.json()).toMatchObject({
      error: expect.stringMatching(/sessão.*ativa/i),
    });

    // Starting a session on a different classroom terminal (SALA-02) succeeds
    const otherRoomRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        classCode: '2B',
        subject: 'História',
        roomId: 'SALA-02',
      },
    });
    expect(otherRoomRes.statusCode).toBe(201);

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
});
