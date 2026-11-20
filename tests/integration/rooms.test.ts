import { createApp } from '@server/main/app';
import { describe, expect, it } from 'vitest';

describe('Controller Seam: Rooms Catalog Management (app.inject)', () => {
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

  it('enforces authentication and role authorization on room endpoints', async () => {
    const { app } = await createApp({}, { enableBackgroundTimer: false });

    // Unauthenticated -> 401
    const unauthList = await app.inject({ method: 'GET', url: '/rooms' });
    expect(unauthList.statusCode).toBe(401);

    const unauthCreate = await app.inject({
      method: 'POST',
      url: '/rooms',
      payload: { code: 'SALA-04', name: 'Sala 04' },
    });
    expect(unauthCreate.statusCode).toBe(401);

    const unauthPatch = await app.inject({
      method: 'PATCH',
      url: '/rooms/room-sala-01/status',
      payload: { isActive: false },
    });
    expect(unauthPatch.statusCode).toBe(401);

    // Teacher -> 200 on GET /rooms, 403 on write endpoints
    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const teacherList = await app.inject({
      method: 'GET',
      url: '/rooms',
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(teacherList.statusCode).toBe(200);
    expect(teacherList.json().rooms.length).toBeGreaterThanOrEqual(4);

    const teacherCreate = await app.inject({
      method: 'POST',
      url: '/rooms',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { code: 'SALA-04', name: 'Sala 04' },
    });
    expect(teacherCreate.statusCode).toBe(403);

    const teacherPatch = await app.inject({
      method: 'PATCH',
      url: '/rooms/room-sala-01/status',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { isActive: false },
    });
    expect(teacherPatch.statusCode).toBe(403);

    await app.close();
  });

  it('seeds default active rooms (SALA-01, SALA-02, SALA-03, LAB-01)', async () => {
    const { app } = await createApp({}, { enableBackgroundTimer: false });
    const coordToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    const res = await app.inject({
      method: 'GET',
      url: '/rooms',
      headers: { authorization: `Bearer ${coordToken}` },
    });

    expect(res.statusCode).toBe(200);
    const rooms = res.json().rooms as Array<{
      id: string;
      code: string;
      name: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }>;

    const codes = rooms.map((r) => r.code);
    expect(codes).toEqual(
      expect.arrayContaining(['SALA-01', 'SALA-02', 'SALA-03', 'LAB-01']),
    );
    for (const room of rooms) {
      expect(room.isActive).toBe(true);
      expect(room.id).toBeTruthy();
      expect(room.name).toBeTruthy();
      expect(room.createdAt).toBeTruthy();
      expect(room.updatedAt).toBeTruthy();
    }

    await app.close();
  });

  it('allows coordinator/admin to create a room with normalized code and rejects duplicates or invalid payloads', async () => {
    const { app } = await createApp({}, { enableBackgroundTimer: false });
    const coordToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );
    const adminToken = await loginAs(
      app,
      'admin@linsdorego.edu.br',
      'admin123',
    );

    // Create with lowercase + whitespace code -> normalized
    const createRes = await app.inject({
      method: 'POST',
      url: '/rooms',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { code: '  lab-02  ', name: '  Laboratório 02  ' },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json().room;
    expect(created).toMatchObject({
      code: 'LAB-02',
      name: 'Laboratório 02',
      isActive: true,
    });
    expect(created.id).toBeTruthy();

    // Duplicate code (case-insensitive) -> 409
    const dupRes = await app.inject({
      method: 'POST',
      url: '/rooms',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { code: 'lab-02', name: 'Outro Lab' },
    });
    expect(dupRes.statusCode).toBe(409);

    // Empty code or name -> 400
    const badRes = await app.inject({
      method: 'POST',
      url: '/rooms',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { code: '   ', name: 'Sem Código' },
    });
    expect(badRes.statusCode).toBe(400);

    // Admin can also create a room with accented/spaced code -> URL-safe slug
    const adminCreateRes = await app.inject({
      method: 'POST',
      url: '/rooms',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { code: 'Lab Química', name: 'Laboratório de Química' },
    });
    expect(adminCreateRes.statusCode).toBe(201);
    expect(adminCreateRes.json().room.code).toBe('LAB-QUIMICA');

    // Punctuation-only code normalizes to empty -> 400
    const punctuationRes = await app.inject({
      method: 'POST',
      url: '/rooms',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { code: '///', name: 'Sala Inválida' },
    });
    expect(punctuationRes.statusCode).toBe(400);

    await app.close();
  });

  it('toggles room active/inactive status and supports onlyActive filtering', async () => {
    const { app } = await createApp({}, { enableBackgroundTimer: false });
    const coordToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    // Get initial list to grab SALA-03 id
    const listRes = await app.inject({
      method: 'GET',
      url: '/rooms',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    const sala03 = listRes
      .json()
      .rooms.find((r: { code: string }) => r.code === 'SALA-03');
    expect(sala03).toBeDefined();

    // Deactivate SALA-03
    const deactivateRes = await app.inject({
      method: 'PATCH',
      url: `/rooms/${sala03.id}/status`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: false },
    });
    expect(deactivateRes.statusCode).toBe(200);
    expect(deactivateRes.json().room).toMatchObject({
      id: sala03.id,
      code: 'SALA-03',
      isActive: false,
    });

    // GET /rooms?onlyActive=true excludes SALA-03
    const activeOnlyRes = await app.inject({
      method: 'GET',
      url: '/rooms?onlyActive=true',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(activeOnlyRes.statusCode).toBe(200);
    const activeCodes = activeOnlyRes
      .json()
      .rooms.map((r: { code: string }) => r.code);
    expect(activeCodes).not.toContain('SALA-03');
    expect(activeCodes).toContain('SALA-01');

    // Reactivate SALA-03
    const reactivateRes = await app.inject({
      method: 'PATCH',
      url: `/rooms/${sala03.id}/status`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: true },
    });
    expect(reactivateRes.statusCode).toBe(200);
    expect(reactivateRes.json().room.isActive).toBe(true);

    // Non-existent room -> 404
    const notFoundRes = await app.inject({
      method: 'PATCH',
      url: '/rooms/non-existent-room-id/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: false },
    });
    expect(notFoundRes.statusCode).toBe(404);

    // Invalid payload -> 400
    const badStatusRes = await app.inject({
      method: 'PATCH',
      url: `/rooms/${sala03.id}/status`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: 'yes' },
    });
    expect(badStatusRes.statusCode).toBe(400);

    await app.close();
  });
});
