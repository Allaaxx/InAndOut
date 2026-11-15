import { createApp } from '@server/main/app';
import { IncidentOutcome } from '@shared/enums';
import { describe, expect, it } from 'vitest';

describe('Controller Seam: School Analytics Overview (GET /analytics/overview)', () => {
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

  it('enforces authentication on GET /analytics/overview (401 unauthenticated, 200 for authenticated teacher/coordinator/admin)', async () => {
    const { app } = await createApp();

    // 1. Unauthenticated -> 401
    const unauthRes = await app.inject({
      method: 'GET',
      url: '/analytics/overview',
    });
    expect(unauthRes.statusCode).toBe(401);

    // 2. Teacher -> 200
    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );
    const teacherRes = await app.inject({
      method: 'GET',
      url: '/analytics/overview',
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(teacherRes.statusCode).toBe(200);
    expect(teacherRes.json()).toHaveProperty('stats');

    // 3. Coordinator -> 200
    const coordToken = await loginAs(
      app,
      'coord@linsdorego.edu.br',
      'coord123',
    );
    const coordRes = await app.inject({
      method: 'GET',
      url: '/analytics/overview',
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(coordRes.statusCode).toBe(200);
    expect(coordRes.json()).toHaveProperty('stats');
  });

  it('calculates statistical aggregations, peak hours, and outcome distribution across real movement lifecycles', async () => {
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

    // 1. Start session for 1A
    await app.inject({
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

    // Student 1001 exits at 08:05
    currentTime = new Date('2026-03-10T08:05:00.000Z');
    await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001' },
    });

    // Student 1001 returns at 08:10 (5 mins duration -> compliant)
    currentTime = new Date('2026-03-10T08:10:00.000Z');
    await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001' },
    });

    // Student 1002 exits at 08:12
    currentTime = new Date('2026-03-10T08:12:00.000Z');
    const exitRes2 = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1002' },
    });
    const mov2Id = exitRes2.json().movement.id;

    // Fast-forward to 08:25 (13 mins later, exceeding 10m limit) and escalate to coordination
    currentTime = new Date('2026-03-10T08:25:00.000Z');
    await app.inject({
      method: 'POST',
      url: `/movements/${mov2Id}/escalate`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { notes: 'Aluno não retornou' },
    });

    // Coordinator resolves mov2 as SENT_TO_INFIRMARY at 08:28 (16 min duration -> not compliant)
    currentTime = new Date('2026-03-10T08:28:00.000Z');
    await app.inject({
      method: 'POST',
      url: `/coordination/movements/${mov2Id}/resolve`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        outcome: IncidentOutcome.SENT_TO_INFIRMARY,
        notes: 'Aluno com indisposição na enfermaria',
      },
    });

    // Student 1001 exits again at 08:30 (10 min standard limit)
    currentTime = new Date('2026-03-10T08:30:00.000Z');
    const exitRes3 = await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001' },
    });
    const _mov3Id = exitRes3.json().movement.id;

    // Student 1001 is still out and becomes overdue at 08:42 (12 mins > 10 mins allowed limit)
    currentTime = new Date('2026-03-10T08:42:00.000Z');
    await app.inject({
      method: 'POST',
      url: '/movements/check-overdue',
      payload: { now: currentTime.toISOString() },
    });

    // Fetch Analytics Overview at 08:45
    currentTime = new Date('2026-03-10T08:45:00.000Z');
    const analyticsRes = await app.inject({
      method: 'GET',
      url: '/analytics/overview?date=2026-03-10',
      headers: { authorization: `Bearer ${coordToken}` },
    });

    expect(analyticsRes.statusCode).toBe(200);
    const data = analyticsRes.json();

    // Verification of Stat Cards
    expect(data.stats.totalExitsToday).toBe(3);
    // Completed exits: mov1 (5 min), mov2 (16 min). Average = (5 + 16) / 2 = 10.5
    expect(data.stats.averageOutsideMinutes).toBe(10.5);
    // Compliance: mov1 (5 <= 10) vs mov2 (16 > 10). 1 of 2 = 50%
    expect(data.stats.complianceRate).toBe(50);
    // Active incidents: mov3 is OVERDUE -> 1
    expect(data.stats.activeIncidentsCount).toBe(1);

    // Verification of Hourly Distribution (Peak Hours)
    const hour8 = data.hourlyDistribution.find(
      (h: { hour: number }) => h.hour === 8,
    );
    expect(hour8).toBeDefined();
    // 3 departures started at 08h (08:05, 08:12, 08:30)
    expect(hour8.count).toBe(3);

    // Verification of Outcomes Distribution
    const returned = data.outcomeDistribution.find(
      (o: { outcome: string }) => o.outcome === 'RETURNED_NORMAL',
    );
    const infirmary = data.outcomeDistribution.find(
      (o: { outcome: string }) =>
        o.outcome === IncidentOutcome.SENT_TO_INFIRMARY,
    );

    expect(returned.count).toBe(1);
    expect(returned.percentage).toBe(50);
    expect(infirmary.count).toBe(1);
    expect(infirmary.percentage).toBe(50);
  });

  it('filters overview metrics by classCode and date range via query parameters', async () => {
    let currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });
    const teacherToken = await loginAs(
      app,
      'prof@linsdorego.edu.br',
      'senha123',
    );

    // Start session in 1A
    await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        classCode: '1A',
        subject: 'Matemática',
        roomId: 'SALA-01',
      },
    });

    // Exit in 1A
    await app.inject({
      method: 'POST',
      url: '/movements/exit',
      payload: { ra: '1001' },
    });
    // Return in 1A after 6 minutes
    currentTime = new Date('2026-03-10T08:06:00.000Z');
    await app.inject({
      method: 'POST',
      url: '/movements/return',
      payload: { ra: '1001' },
    });

    // Filter by classCode 1A -> 1 exit
    const res1A = await app.inject({
      method: 'GET',
      url: '/analytics/overview?classCode=1A',
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(res1A.statusCode).toBe(200);
    expect(res1A.json().stats.totalExitsToday).toBe(1);
    expect(res1A.json().stats.averageOutsideMinutes).toBe(6);

    // Filter by classCode 2B -> 0 exits
    const res2B = await app.inject({
      method: 'GET',
      url: '/analytics/overview?classCode=2B',
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(res2B.statusCode).toBe(200);
    expect(res2B.json().stats.totalExitsToday).toBe(0);
    expect(res2B.json().stats.averageOutsideMinutes).toBe(0);
  });
});
