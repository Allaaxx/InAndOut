import { describe, it, expect } from 'vitest';
import { createApp } from '@server/main/app';

describe('Controller Seam: Student History & Analytics Export (GET /analytics/students/:ra and GET /analytics/export)', () => {
  async function loginAs(
    app: Awaited<ReturnType<typeof createApp>>['app'],
    email: string,
    password: string
  ): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    expect(res.statusCode).toBe(200);
    return res.json().token as string;
  }

  it('queries student history by RA and validates attendance percentage calculation integrity', async () => {
    let currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123'
    );

    // 1. Unauthenticated request -> 401
    const unauthRes = await app.inject({
      method: 'GET',
      url: '/analytics/students/1001',
    });
    expect(unauthRes.statusCode).toBe(401);

    // 2. Query non-existent student -> 404
    const notFoundRes = await app.inject({
      method: 'GET',
      url: '/analytics/students/9999',
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(notFoundRes.statusCode).toBe(404);
    expect(notFoundRes.json().error).toMatch(/não encontrado/i);

    // 3. Start session and register movements for student 1001
    await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        classCode: '1A',
        subject: 'Matemática',
        roomId: 'SALA-01',
        plannedDurationMinutes: 50,
      },
    });

    // Exit at 08:05
    currentTime = new Date('2026-03-10T08:05:00.000Z');
    await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001' },
    });

    // Return at 08:10 (5 minutes outside -> 45 minutes attended -> 90% attendance)
    currentTime = new Date('2026-03-10T08:10:00.000Z');
    await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001' },
    });

    // 4. Query student 1001 history
    const historyRes = await app.inject({
      method: 'GET',
      url: '/analytics/students/1001',
      headers: { authorization: `Bearer ${teacherToken}` },
    });

    expect(historyRes.statusCode).toBe(200);
    const data = historyRes.json();

    // Student identity
    expect(data.student.ra).toBe('1001');
    expect(data.student.fullName).toBe('Lucas Silva');
    expect(data.student.classCode).toBe('1A');

    // Summary calculations
    expect(data.summary.totalExits).toBe(1);
    expect(data.summary.totalDepartures).toBe(1);
    expect(data.summary.totalAbsentMinutes).toBe(5);
    expect(data.summary.totalMinutesOutside).toBe(5);
    expect(data.summary.averageDurationMinutes).toBe(5);
    expect(data.summary.attendedMinutes).toBe(45);
    expect(data.summary.attendancePercentage).toBe(90);
    expect(data.summary.effectiveAttendancePercentage).toBe(90);

    // History movements
    expect(data.history).toHaveLength(1);
    expect(data.history[0].studentRa).toBe('1001');
    expect(data.history[0].durationMinutes).toBe(5);
    expect(data.history[0].attendancePercentage).toBe(90);
  });

  it('exports movement reports in CSV format with appropriate Content-Type and Content-Disposition', async () => {
    let currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });
    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123'
    );

    // Create session and movement
    await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { classCode: '1A', subject: 'História' },
    });

    await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001' },
    });

    currentTime = new Date('2026-03-10T08:07:00.000Z');
    await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001' },
    });

    // Unauthenticated export -> 401
    const unauthRes = await app.inject({
      method: 'GET',
      url: '/analytics/export?format=csv',
    });
    expect(unauthRes.statusCode).toBe(401);

    // Invalid format -> 400
    const invalidRes = await app.inject({
      method: 'GET',
      url: '/analytics/export?format=xlsx',
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(invalidRes.statusCode).toBe(400);

    // Valid CSV export
    const csvRes = await app.inject({
      method: 'GET',
      url: '/analytics/export?format=csv&ra=1001',
      headers: { authorization: `Bearer ${teacherToken}` },
    });

    expect(csvRes.statusCode).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.headers['content-disposition']).toMatch(/attachment;\s*filename=.*\.csv/);
    expect(csvRes.body).toContain('Data/Hora,RA,Aluno,Turma');
    expect(csvRes.body).toContain('1001');
    expect(csvRes.body).toContain('Lucas Silva');
    expect(csvRes.body).toContain('História');
  });

  it('exports movement reports in PDF format with proper %PDF header and application/pdf Content-Type', async () => {
    let currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });
    const coordToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123'
    );

    // Valid PDF export
    const pdfRes = await app.inject({
      method: 'GET',
      url: '/analytics/export?format=pdf&classCode=1A',
      headers: { authorization: `Bearer ${coordToken}` },
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    expect(pdfRes.headers['content-disposition']).toMatch(/attachment;\s*filename=.*\.pdf/);

    const rawBuffer = pdfRes.rawPayload;
    expect(rawBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(rawBuffer.toString('utf-8')).toContain('%%EOF');
  });
});
