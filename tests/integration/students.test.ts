import { createApp } from '@server/main/app';
import { describe, expect, it } from 'vitest';

describe('Controller Seam: Students Catalog Management (app.inject)', () => {
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

  it('enforces RBAC on GET /students and filters by search, classGroupId/classCode, and isActive/onlyActive', async () => {
    const { app } = await createApp({}, { enableBackgroundTimer: false });

    // Unauthenticated -> 401
    const unauthRes = await app.inject({ method: 'GET', url: '/students' });
    expect(unauthRes.statusCode).toBe(401);

    // Teacher -> 403
    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const teacherRes = await app.inject({
      method: 'GET',
      url: '/students',
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(teacherRes.statusCode).toBe(403);

    // Coordinator -> 200
    const coordToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );
    const coordRes = await app.inject({
      method: 'GET',
      url: '/students',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(coordRes.statusCode).toBe(200);

    const students = coordRes.json().students as Array<{
      id: string;
      ra: string;
      fullName: string;
      classGroupId?: string;
      classCode: string;
      hasSpecialCondition: boolean;
      specialLimitMinutes?: number;
      isActive: boolean;
    }>;

    expect(students.length).toBeGreaterThanOrEqual(4);
    const lucas = students.find((s) => s.ra === '1001');
    expect(lucas).toMatchObject({
      ra: '1001',
      fullName: 'Lucas Silva',
      classCode: '1A',
      classGroupId: 'class-2026-1a',
      hasSpecialCondition: false,
      isActive: true,
    });

    const ana = students.find((s) => s.ra === '1003');
    expect(ana).toMatchObject({
      ra: '1003',
      fullName: 'Ana Costa',
      classCode: '1A',
      classGroupId: 'class-2026-1a',
      hasSpecialCondition: true,
      specialLimitMinutes: 20,
      isActive: true,
    });

    // Admin also allowed -> 200
    const adminToken = await loginAs(
      app,
      'admin@linsdorego.edu.br',
      'admin123',
    );
    const adminRes = await app.inject({
      method: 'GET',
      url: '/students',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(adminRes.statusCode).toBe(200);

    // Filter by search (name substring, case-insensitive)
    const searchNameRes = await app.inject({
      method: 'GET',
      url: '/students?search=lucas',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(searchNameRes.statusCode).toBe(200);
    expect(searchNameRes.json().students).toHaveLength(1);
    expect(searchNameRes.json().students[0].ra).toBe('1001');

    // Filter by search (RA)
    const searchRaRes = await app.inject({
      method: 'GET',
      url: '/students?search=2001',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(searchRaRes.statusCode).toBe(200);
    expect(searchRaRes.json().students).toHaveLength(1);
    expect(searchRaRes.json().students[0].fullName).toBe('Pedro Alves');

    // Filter by classGroupId
    const byClassGroupRes = await app.inject({
      method: 'GET',
      url: '/students?classGroupId=class-2026-2b',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(byClassGroupRes.statusCode).toBe(200);
    expect(byClassGroupRes.json().students).toHaveLength(1);
    expect(byClassGroupRes.json().students[0].ra).toBe('2001');

    // Filter by classCode
    const byClassCodeRes = await app.inject({
      method: 'GET',
      url: '/students?classCode=1a',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(byClassCodeRes.statusCode).toBe(200);
    expect(byClassCodeRes.json().students.length).toBe(3);

    // Filter by isActive=false (none initially)
    const inactiveRes = await app.inject({
      method: 'GET',
      url: '/students?isActive=false',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(inactiveRes.statusCode).toBe(200);
    expect(inactiveRes.json().students).toHaveLength(0);

    await app.close();
  });

  it('creates students via POST /students with RBAC, numeric unique RA, active ClassGroup, and Tempo Especial validation', async () => {
    const { app } = await createApp({}, { enableBackgroundTimer: false });

    // Unauthenticated -> 401
    const unauthRes = await app.inject({
      method: 'POST',
      url: '/students',
      payload: {
        ra: '4001',
        fullName: 'Mariana Souza',
        classGroupId: 'class-2026-1a',
      },
    });
    expect(unauthRes.statusCode).toBe(401);

    // Teacher -> 403
    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const teacherRes = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        ra: '4001',
        fullName: 'Mariana Souza',
        classGroupId: 'class-2026-1a',
      },
    });
    expect(teacherRes.statusCode).toBe(403);

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

    // Valid creation without Tempo Especial
    const createRes = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        ra: '4001',
        fullName: '  Mariana Souza  ',
        classGroupId: 'class-2026-1a',
      },
    });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.json().student).toMatchObject({
      ra: '4001',
      fullName: 'Mariana Souza',
      publicName: 'Mariana S.',
      classGroupId: 'class-2026-1a',
      classCode: '1A',
      hasSpecialCondition: false,
      isActive: true,
    });
    expect(createRes.json().student.specialLimitMinutes).toBeUndefined();

    // Valid creation with Tempo Especial by ADMIN
    const specialRes = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        ra: '4002',
        fullName: 'Rafael Oliveira',
        classGroupId: 'class-2026-2b',
        hasSpecialCondition: true,
        specialLimitMinutes: 25,
      },
    });
    expect(specialRes.statusCode).toBe(201);
    expect(specialRes.json().student).toMatchObject({
      ra: '4002',
      fullName: 'Rafael Oliveira',
      classGroupId: 'class-2026-2b',
      classCode: '2B',
      hasSpecialCondition: true,
      specialLimitMinutes: 25,
      specialTimeLimitMinutes: 25,
      isActive: true,
    });

    // Duplicate RA -> 409
    const dupRes = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        ra: '4001',
        fullName: 'Outro Aluno',
        classGroupId: 'class-2026-1a',
      },
    });
    expect(dupRes.statusCode).toBe(409);

    // Non-numeric RA -> 400
    const badRaRes = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        ra: 'RA-4003',
        fullName: 'Aluno Inválido',
        classGroupId: 'class-2026-1a',
      },
    });
    expect(badRaRes.statusCode).toBe(400);

    // Unknown ClassGroup -> 400
    const unknownClassRes = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        ra: '4004',
        fullName: 'Aluno Sem Turma',
        classGroupId: 'class-does-not-exist',
      },
    });
    expect(unknownClassRes.statusCode).toBe(400);

    // Inactive ClassGroup -> 400
    const deactivateClassRes = await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-3b/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: false },
    });
    expect(deactivateClassRes.statusCode).toBe(200);

    const inactiveClassRes = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        ra: '4005',
        fullName: 'Aluno Turma Inativa',
        classGroupId: 'class-2026-3b',
      },
    });
    expect(inactiveClassRes.statusCode).toBe(400);

    // Invalid Tempo Especial (enabled with 0 or missing minutes) -> 400
    const zeroSpecialRes = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        ra: '4006',
        fullName: 'Aluno Tempo Zero',
        classGroupId: 'class-2026-1a',
        hasSpecialCondition: true,
        specialLimitMinutes: 0,
      },
    });
    expect(zeroSpecialRes.statusCode).toBe(400);

    const missingSpecialRes = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        ra: '4007',
        fullName: 'Aluno Sem Minutos',
        classGroupId: 'class-2026-1a',
        hasSpecialCondition: true,
      },
    });
    expect(missingSpecialRes.statusCode).toBe(400);

    await app.close();
  });

  it('updates fullName, transfers active ClassGroup, manages Tempo Especial, and keeps RA strictly immutable on PATCH /students/:id', async () => {
    const { app } = await createApp({}, { enableBackgroundTimer: false });

    // Unauthenticated -> 401
    const unauthRes = await app.inject({
      method: 'PATCH',
      url: '/students/student-1',
      payload: { fullName: 'Lucas Silva Junior' },
    });
    expect(unauthRes.statusCode).toBe(401);

    // Teacher -> 403
    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const teacherRes = await app.inject({
      method: 'PATCH',
      url: '/students/student-1',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { fullName: 'Lucas Silva Junior' },
    });
    expect(teacherRes.statusCode).toBe(403);

    const coordToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    // Attempt to mutate RA -> rejected (400) and RA remains unchanged
    const mutateRaRes = await app.inject({
      method: 'PATCH',
      url: '/students/student-1',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { ra: '9999', fullName: 'Lucas Alterado' },
    });
    expect(mutateRaRes.statusCode).toBe(400);

    // Edit fullName, transfer to 2B, and enable Tempo Especial (18 min)
    const updateRes = await app.inject({
      method: 'PATCH',
      url: '/students/student-1',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        fullName: 'Lucas Silva Pereira',
        classGroupId: 'class-2026-2b',
        hasSpecialCondition: true,
        specialLimitMinutes: 18,
      },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().student).toMatchObject({
      id: 'student-1',
      ra: '1001',
      fullName: 'Lucas Silva Pereira',
      classGroupId: 'class-2026-2b',
      classCode: '2B',
      hasSpecialCondition: true,
      specialLimitMinutes: 18,
      specialTimeLimitMinutes: 18,
    });

    // Clear Tempo Especial
    const clearSpecialRes = await app.inject({
      method: 'PATCH',
      url: '/students/student-1',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        hasSpecialCondition: false,
      },
    });
    expect(clearSpecialRes.statusCode).toBe(200);
    expect(clearSpecialRes.json().student.hasSpecialCondition).toBe(false);
    expect(clearSpecialRes.json().student.specialLimitMinutes).toBeUndefined();

    // Transfer to inactive ClassGroup -> 400
    await app.inject({
      method: 'PATCH',
      url: '/classes/class-2026-3b/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: false },
    });

    const inactiveTransferRes = await app.inject({
      method: 'PATCH',
      url: '/students/student-1',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { classGroupId: 'class-2026-3b' },
    });
    expect(inactiveTransferRes.statusCode).toBe(400);

    // Non-existent student -> 404
    const notFoundRes = await app.inject({
      method: 'PATCH',
      url: '/students/non-existent-id',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { fullName: 'Teste' },
    });
    expect(notFoundRes.statusCode).toBe(404);

    // Empty body -> 400
    const emptyBodyRes = await app.inject({
      method: 'PATCH',
      url: '/students/student-1',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {},
    });
    expect(emptyBodyRes.statusCode).toBe(400);

    await app.close();
  });

  it('toggles student status and allows deactivation/transfer without blocking when student is IN_TRANSIT or in waiting queue', async () => {
    const { app } = await createApp({}, { enableBackgroundTimer: false });

    // Unauthenticated -> 401
    const unauthStatus = await app.inject({
      method: 'PATCH',
      url: '/students/student-1/status',
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
      url: '/students/student-1/status',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { isActive: false },
    });
    expect(teacherStatus.statusCode).toBe(403);

    const coordToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );

    // Start an active session for 1A so student-1 (1001) is IN_TRANSIT and student-2 (1002) is WAITING in queue
    const startSessionRes = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        classCode: '1A',
        subject: 'História',
        roomId: 'SALA-01',
      },
    });
    expect(startSessionRes.statusCode).toBe(201);
    const sessionId = startSessionRes.json().session.id as string;

    const exitRes = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001', sessionId },
    });
    expect(exitRes.statusCode).toBe(201);

    const queueRes = await app.inject({
      method: 'POST',
      url: '/movements/queue',
      payload: { ra: '1002', sessionId },
    });
    expect(queueRes.statusCode).toBe(201);

    // Deactivate student-1 while IN_TRANSIT -> MUST succeed (200) per ADR 0002 / ADR 0009
    const deactivateInTransitRes = await app.inject({
      method: 'PATCH',
      url: '/students/student-1/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: false },
    });
    expect(deactivateInTransitRes.statusCode).toBe(200);
    expect(deactivateInTransitRes.json().student).toMatchObject({
      id: 'student-1',
      ra: '1001',
      isActive: false,
    });

    // Transfer student-2 while in waiting queue -> MUST succeed (200)
    const transferQueuedRes = await app.inject({
      method: 'PATCH',
      url: '/students/student-2',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { classGroupId: 'class-2026-2b' },
    });
    expect(transferQueuedRes.statusCode).toBe(200);
    expect(transferQueuedRes.json().student.classCode).toBe('2B');

    // Deactivate student-2 while in waiting queue -> MUST succeed (200)
    const deactivateQueuedRes = await app.inject({
      method: 'PATCH',
      url: '/students/student-2/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: false },
    });
    expect(deactivateQueuedRes.statusCode).toBe(200);
    expect(deactivateQueuedRes.json().student.isActive).toBe(false);

    // Filter by isActive=false returns student-1 and student-2
    const inactiveListRes = await app.inject({
      method: 'GET',
      url: '/students?isActive=false',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(inactiveListRes.statusCode).toBe(200);
    const inactiveRas = inactiveListRes
      .json()
      .students.map((s: { ra: string }) => s.ra);
    expect(inactiveRas).toEqual(expect.arrayContaining(['1001', '1002']));

    // Filter by onlyActive=true excludes student-1 and student-2
    const activeListRes = await app.inject({
      method: 'GET',
      url: '/students?onlyActive=true',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(activeListRes.statusCode).toBe(200);
    const activeRas = activeListRes
      .json()
      .students.map((s: { ra: string }) => s.ra);
    expect(activeRas).not.toContain('1001');
    expect(activeRas).not.toContain('1002');

    // Reactivate student-1 -> 200
    const reactivateRes = await app.inject({
      method: 'PATCH',
      url: '/students/student-1/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: true },
    });
    expect(reactivateRes.statusCode).toBe(200);
    expect(reactivateRes.json().student.isActive).toBe(true);

    // Non-existent student -> 404
    const notFoundStatus = await app.inject({
      method: 'PATCH',
      url: '/students/non-existent-id/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: false },
    });
    expect(notFoundStatus.statusCode).toBe(404);

    // Invalid payload -> 400
    const badStatusPayload = await app.inject({
      method: 'PATCH',
      url: '/students/student-1/status',
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { isActive: 'nope' },
    });
    expect(badStatusPayload.statusCode).toBe(400);

    await app.close();
  });
});
