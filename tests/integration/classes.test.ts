import { createApp } from '@server/main/app';
import { describe, expect, it } from 'vitest';

describe('Controller Seam: Classes Catalog Management (app.inject)', () => {
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

  it('seeds default active classes (1A..3B for 2026) and enforces auth on GET /classes', async () => {
    const { app } = await createApp({}, { enableBackgroundTimer: false });

    const unauthRes = await app.inject({ method: 'GET', url: '/classes' });
    expect(unauthRes.statusCode).toBe(401);

    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const teacherRes = await app.inject({
      method: 'GET',
      url: '/classes',
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(teacherRes.statusCode).toBe(200);

    const classes = teacherRes.json().classes as Array<{
      id: string;
      code: string;
      name: string;
      academicYear: number;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }>;

    expect(classes.map((c) => c.code)).toEqual(
      expect.arrayContaining(['1A', '1B', '2A', '2B', '3A', '3B']),
    );
    for (const item of classes) {
      expect(item.academicYear).toBe(2026);
      expect(item.isActive).toBe(true);
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.createdAt).toBeTruthy();
      expect(item.updatedAt).toBeTruthy();
    }

    await app.close();
  });

  it('enforces RBAC on write endpoints and allows creating classes with composite (code, academicYear) uniqueness', async () => {
    const { app } = await createApp({}, { enableBackgroundTimer: false });

    // Unauthenticated POST -> 401
    const unauthCreate = await app.inject({
      method: 'POST',
      url: '/classes',
      payload: { code: '1C', name: '1º Ano C', academicYear: 2026 },
    });
    expect(unauthCreate.statusCode).toBe(401);

    // Teacher POST -> 403
    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const teacherCreate = await app.inject({
      method: 'POST',
      url: '/classes',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { code: '1C', name: '1º Ano C', academicYear: 2026 },
    });
    expect(teacherCreate.statusCode).toBe(403);

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

    // Coordinator creates with lowercase + whitespace code -> normalized to uppercase
    const createRes = await app.inject({
      method: 'POST',
      url: '/classes',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { code: '  1c  ', name: '  1º Ano C  ', academicYear: 2026 },
    });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.json().classGroup).toMatchObject({
      code: '1C',
      name: '1º Ano C',
      academicYear: 2026,
      isActive: true,
    });

    // Duplicate (code, academicYear) case-insensitive -> 409
    const dupRes = await app.inject({
      method: 'POST',
      url: '/classes',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { code: '1c', name: 'Outra 1C', academicYear: 2026 },
    });
    expect(dupRes.statusCode).toBe(409);

    // Same code in different academicYear (1A in 2027) -> 201 (coexists with 1A 2026)
    const nextYearRes = await app.inject({
      method: 'POST',
      url: '/classes',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { code: '1a', name: '1º Ano A (2027)', academicYear: 2027 },
    });
    expect(nextYearRes.statusCode).toBe(201);
    expect(nextYearRes.json().classGroup).toMatchObject({
      code: '1A',
      name: '1º Ano A (2027)',
      academicYear: 2027,
      isActive: true,
    });

    // Filter by academicYear=2027 returns only 2027 class
    const year2027List = await app.inject({
      method: 'GET',
      url: '/classes?academicYear=2027',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(year2027List.statusCode).toBe(200);
    expect(year2027List.json().classes).toHaveLength(1);
    expect(year2027List.json().classes[0]).toMatchObject({
      code: '1A',
      academicYear: 2027,
    });

    // Invalid payloads -> 400
    const emptyCodeRes = await app.inject({
      method: 'POST',
      url: '/classes',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { code: '   ', name: 'Sem Código', academicYear: 2026 },
    });
    expect(emptyCodeRes.statusCode).toBe(400);

    const punctuationOnlyCodeRes = await app.inject({
      method: 'POST',
      url: '/classes',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { code: ' --- !!! ', name: 'Pontuação', academicYear: 2026 },
    });
    expect(punctuationOnlyCodeRes.statusCode).toBe(400);

    const invalidYearRes = await app.inject({
      method: 'POST',
      url: '/classes',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { code: '1D', name: '1º Ano D', academicYear: 1990 },
    });
    expect(invalidYearRes.statusCode).toBe(400);

    await app.close();
  });

  it('allows updating class name and academicYear while enforcing composite uniqueness and RBAC', async () => {
    const { app } = await createApp({}, { enableBackgroundTimer: false });

    // Unauthenticated PATCH -> 401
    const unauthPatch = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-1a',
      payload: { name: '1º Ano A — Integral' },
    });
    expect(unauthPatch.statusCode).toBe(401);

    // Teacher PATCH -> 403
    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const teacherPatch = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-1a',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { name: '1º Ano A — Integral' },
    });
    expect(teacherPatch.statusCode).toBe(403);

    const coordToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    // Create 1A for 2027 so we can test collision on academicYear update
    const create2027 = await app.inject({
      method: 'POST',
      url: '/classes',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { code: '1A', name: '1º Ano A 2027', academicYear: 2027 },
    });
    expect(create2027.statusCode).toBe(201);

    // Edit name of 1A (2026) -> 200
    const editNameRes = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-1a',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { name: '1º Ano A — Manhã' },
    });
    expect(editNameRes.statusCode).toBe(200);
    expect(editNameRes.json().classGroup).toMatchObject({
      id: 'class-2026-1a',
      code: '1A',
      name: '1º Ano A — Manhã',
      academicYear: 2026,
    });

    // Updating 1A (2026) to academicYear 2027 collides with existing 1A (2027) -> 409
    const conflictRes = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-1a',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { academicYear: 2027 },
    });
    expect(conflictRes.statusCode).toBe(409);

    // Updating 1A (2026) to academicYear 2028 succeeds -> 200
    const editYearRes = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-1a',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { academicYear: 2028 },
    });
    expect(editYearRes.statusCode).toBe(200);
    expect(editYearRes.json().classGroup.academicYear).toBe(2028);

    // Non-existent class -> 404
    const notFoundRes = await app.inject({
      method: 'PATCH',
      url: '/classes/non-existent-id',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { name: 'Teste' },
    });
    expect(notFoundRes.statusCode).toBe(404);

    // Empty body or invalid name -> 400
    const emptyBodyRes = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-1a',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {},
    });
    expect(emptyBodyRes.statusCode).toBe(400);

    await app.close();
  });

  it('toggles class active/inactive status and supports onlyActive filtering', async () => {
    const { app } = await createApp({}, { enableBackgroundTimer: false });

    // Unauthenticated -> 401
    const unauthStatus = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-3b/status',
      payload: { isActive: false },
    });
    expect(unauthStatus.statusCode).toBe(401);

    // Teacher -> 403
    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const teacherStatus = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-3b/status',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { isActive: false },
    });
    expect(teacherStatus.statusCode).toBe(403);

    const coordToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    // Deactivate 3B
    const deactivateRes = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-3b/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: false },
    });
    expect(deactivateRes.statusCode).toBe(200);
    expect(deactivateRes.json().classGroup).toMatchObject({
      id: 'class-2026-3b',
      code: '3B',
      isActive: false,
    });

    // GET /classes?onlyActive=true excludes 3B
    const activeOnlyRes = await app.inject({
      method: 'GET',
      url: '/classes?onlyActive=true',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(activeOnlyRes.statusCode).toBe(200);
    const activeCodes = activeOnlyRes
      .json()
      .classes.map((c: { code: string }) => c.code);
    expect(activeCodes).not.toContain('3B');
    expect(activeCodes).toContain('1A');

    // Reactivate 3B
    const reactivateRes = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-3b/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: true },
    });
    expect(reactivateRes.statusCode).toBe(200);
    expect(reactivateRes.json().classGroup.isActive).toBe(true);

    // Non-existent class -> 404
    const notFoundRes = await app.inject({
      method: 'PATCH',
      url: '/classes/non-existent-id/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: false },
    });
    expect(notFoundRes.statusCode).toBe(404);

    // Invalid payload -> 400
    const invalidPayloadRes = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-3b/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: 'yes' },
    });
    expect(invalidPayloadRes.statusCode).toBe(400);

    await app.close();
  });

  it('rejects deactivating a Turma with an ACTIVE ClassSession (HTTP 409) and allows deactivation once ended even with enrolled students', async () => {
    const { app, container } = await createApp(
      {},
      { enableBackgroundTimer: false },
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

    // Verify 1A has enrolled students in seed
    const enrolledIn1A = await container.studentRepo.findByClassCode('1A');
    expect(enrolledIn1A.length).toBeGreaterThan(0);

    // Start an active session for Turma 1A
    const startRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        classGroupId: 'class-2026-1a',
        subject: 'Matemática',
        roomId: 'SALA-01',
      },
    });
    expect(startRes.statusCode).toBe(201);
    const sessionId = startRes.json().session.id as string;

    // Attempt to deactivate 1A while session is ACTIVE -> 409 Conflict
    const blockedDeactivateRes = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-1a/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: false },
    });
    expect(blockedDeactivateRes.statusCode).toBe(409);
    expect(blockedDeactivateRes.json()).toMatchObject({
      error: expect.stringMatching(/sessão.*ativa/i),
    });

    // End the active session
    const endRes = await app.inject({
      method: 'POST',
      url: '/sessions/end',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { sessionId },
    });
    expect(endRes.statusCode).toBe(200);

    // Now deactivating 1A succeeds -> 200 (even though students remain enrolled in 1A)
    const allowedDeactivateRes = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-1a/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: false },
    });
    expect(allowedDeactivateRes.statusCode).toBe(200);
    expect(allowedDeactivateRes.json().classGroup).toMatchObject({
      id: 'class-2026-1a',
      code: '1A',
      isActive: false,
    });

    await app.close();
  });
});
