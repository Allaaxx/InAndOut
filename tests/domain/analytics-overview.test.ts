import { GetSchoolOverviewAnalyticsUseCase } from '@server/application/use-cases/analytics/GetSchoolOverviewAnalyticsUseCase';
import { MovementRecord } from '@server/domain/entities/MovementRecord';
import { InMemoryMovementRecordRepository } from '@server/infrastructure/repositories/InMemoryMovementRecordRepository';
import { IncidentOutcome } from '@shared/enums';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Domain Seam: GetSchoolOverviewAnalyticsUseCase', () => {
  let movementRepo: InMemoryMovementRecordRepository;
  const fixedClock = new Date('2026-03-10T14:00:00.000Z');

  beforeEach(() => {
    movementRepo = new InMemoryMovementRecordRepository();
  });

  it('calculates school overview stat cards correctly (averageOutsideMinutes, totalExitsToday, complianceRate, activeIncidentsCount)', async () => {
    const useCase = new GetSchoolOverviewAnalyticsUseCase(movementRepo, {
      clock: () => fixedClock,
    });

    // 1. Normal return within limit (5 mins out of 10)
    const mov1 = MovementRecord.create({
      sessionId: 'sess-1',
      studentId: '1001',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'Matemática',
      allowedLimitMinutes: 10,
      startedAt: new Date('2026-03-10T08:00:00.000Z'),
    });
    mov1.registerReturn(new Date('2026-03-10T08:05:00.000Z'), 50);
    await movementRepo.save(mov1);

    // 2. Normal return exceeding limit (15 mins out of 10 -> overdue return)
    const mov2 = MovementRecord.create({
      sessionId: 'sess-1',
      studentId: '1002',
      studentRa: '1002',
      studentFullName: 'João Mendes',
      classCode: '1A',
      subject: 'Matemática',
      allowedLimitMinutes: 10,
      startedAt: new Date('2026-03-10T08:10:00.000Z'),
    });
    mov2.registerReturn(new Date('2026-03-10T08:25:00.000Z'), 50);
    await movementRepo.save(mov2);

    // 3. Movement resolved by coordination after 10 mins (within limit)
    const mov3 = MovementRecord.create({
      sessionId: 'sess-2',
      studentId: '1003',
      studentRa: '1003',
      studentFullName: 'Ana Costa',
      classCode: '2B',
      subject: 'Física',
      allowedLimitMinutes: 20,
      startedAt: new Date('2026-03-10T09:00:00.000Z'),
    });
    mov3.resolve(
      IncidentOutcome.SENT_TO_INFIRMARY,
      'coord-1',
      new Date('2026-03-10T09:10:00.000Z'),
      'Aluno medicado na enfermaria',
      50,
    );
    await movementRepo.save(mov3);

    // 4. Active movement: Overdue (active incident)
    const mov4 = MovementRecord.create({
      sessionId: 'sess-2',
      studentId: '2001',
      studentRa: '2001',
      studentFullName: 'Pedro Alves',
      classCode: '2B',
      subject: 'Física',
      allowedLimitMinutes: 10,
      startedAt: new Date('2026-03-10T13:40:00.000Z'),
    });
    mov4.markOverdue(new Date('2026-03-10T13:51:00.000Z'));
    await movementRepo.save(mov4);

    // 5. Active movement: Escalated to coordination (active incident)
    const mov5 = MovementRecord.create({
      sessionId: 'sess-2',
      studentId: '2002',
      studentRa: '2002',
      studentFullName: 'Mariana Lima',
      classCode: '2B',
      subject: 'Física',
      allowedLimitMinutes: 10,
      startedAt: new Date('2026-03-10T13:30:00.000Z'),
    });
    mov5.escalate(new Date('2026-03-10T13:43:00.000Z'), 'AUTOMATIC');
    await movementRepo.save(mov5);

    // 6. In-transit unresolved (active incident)
    const mov6 = MovementRecord.create({
      sessionId: 'sess-3',
      studentId: '3001',
      studentRa: '3001',
      studentFullName: 'Carlos Souza',
      classCode: '3C',
      subject: 'História',
      allowedLimitMinutes: 10,
      startedAt: new Date('2026-03-10T11:00:00.000Z'),
    });
    mov6.markInTransitUnresolved();
    await movementRepo.save(mov6);

    // 7. Regular in-transit (not an incident)
    const mov7 = MovementRecord.create({
      sessionId: 'sess-3',
      studentId: '3002',
      studentRa: '3002',
      studentFullName: 'Beatriz Ramos',
      classCode: '3C',
      subject: 'História',
      allowedLimitMinutes: 10,
      startedAt: new Date('2026-03-10T13:55:00.000Z'),
    });
    await movementRepo.save(mov7);

    // 8. Exit from yesterday (should not count in totalExitsToday)
    const mov8 = MovementRecord.create({
      sessionId: 'sess-old',
      studentId: '1001',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'Português',
      allowedLimitMinutes: 10,
      startedAt: new Date('2026-03-09T10:00:00.000Z'),
    });
    mov8.registerReturn(new Date('2026-03-09T10:08:00.000Z'), 50);
    await movementRepo.save(mov8);

    const result = await useCase.execute();

    // Completed movements on all time: mov1 (5 min), mov2 (15 min), mov3 (10 min), mov8 (8 min)
    // Total completed = 4. Total duration = 38. Average = 38 / 4 = 9.5
    expect(result.stats.averageOutsideMinutes).toBe(9.5);
    expect(result.stats.averageAbsentMinutes).toBe(9.5);

    // Total exits today (2026-03-10): mov1, mov2, mov3, mov4, mov5, mov6, mov7 -> 7
    expect(result.stats.totalExitsToday).toBe(7);

    // Compliance rate:
    // Completed: mov1 (5 <= 10 ok), mov2 (15 > 10 no), mov3 (10 <= 20 ok), mov8 (8 <= 10 ok).
    // Compliant = 3 / 4 = 75.0%
    expect(result.stats.complianceRate).toBe(75);

    // Active incidents: mov4 (OVERDUE), mov5 (ESCALATED), mov6 (IN_TRANSIT_UNRESOLVED) -> 3
    expect(result.stats.activeIncidentsCount).toBe(3);
    expect(result.stats.activeIncidents).toBe(3);
  });

  it('aggregates hourly distribution and identifies peak hours', async () => {
    const useCase = new GetSchoolOverviewAnalyticsUseCase(movementRepo, {
      clock: () => fixedClock,
    });

    // 3 departures at 08h (America/Sao_Paulo)
    for (let i = 0; i < 3; i++) {
      const mov = MovementRecord.create({
        sessionId: 'sess-1',
        studentId: `100${i}`,
        studentRa: `100${i}`,
        studentFullName: `Aluno ${i}`,
        classCode: '1A',
        subject: 'Matemática',
        startedAt: new Date('2026-03-10T08:15:00.000-03:00'),
      });
      await movementRepo.save(mov);
    }

    // 5 departures at 10h (America/Sao_Paulo)
    for (let i = 0; i < 5; i++) {
      const mov = MovementRecord.create({
        sessionId: 'sess-1',
        studentId: `200${i}`,
        studentRa: `200${i}`,
        studentFullName: `Aluno B${i}`,
        classCode: '2B',
        subject: 'Física',
        startedAt: new Date('2026-03-10T10:20:00.000-03:00'),
      });
      await movementRepo.save(mov);
    }

    const result = await useCase.execute({ date: '2026-03-10' });

    expect(Array.isArray(result.hourlyDistribution)).toBe(true);
    expect(result.hourlyDistribution.length).toBeGreaterThan(0);

    const hour8 = result.hourlyDistribution.find(
      (h) => h.hour === 8 || h.label.includes('08'),
    );
    const hour10 = result.hourlyDistribution.find(
      (h) => h.hour === 10 || h.label.includes('10'),
    );

    expect(hour8?.count).toBe(3);
    expect(hour10?.count).toBe(5);
  });

  it('aggregates outcome distribution across RETURNED_NORMAL, SENT_TO_INFIRMARY, ATTENDED_AT_COORDINATION, and EVASION', async () => {
    const useCase = new GetSchoolOverviewAnalyticsUseCase(movementRepo, {
      clock: () => fixedClock,
    });

    // 4 RETURNED_NORMAL
    for (let i = 0; i < 4; i++) {
      const mov = MovementRecord.create({
        sessionId: 'sess-1',
        studentId: `100${i}`,
        studentRa: `100${i}`,
        studentFullName: `Aluno ${i}`,
        classCode: '1A',
        subject: 'Matemática',
        startedAt: new Date('2026-03-10T08:00:00.000Z'),
      });
      mov.registerReturn(new Date('2026-03-10T08:06:00.000Z'), 50);
      await movementRepo.save(mov);
    }

    // 2 SENT_TO_INFIRMARY
    for (let i = 0; i < 2; i++) {
      const mov = MovementRecord.create({
        sessionId: 'sess-1',
        studentId: `200${i}`,
        studentRa: `200${i}`,
        studentFullName: `Aluno ${i}`,
        classCode: '1A',
        subject: 'Matemática',
        startedAt: new Date('2026-03-10T08:10:00.000Z'),
      });
      mov.resolve(
        IncidentOutcome.SENT_TO_INFIRMARY,
        'coord-1',
        new Date('2026-03-10T08:20:00.000Z'),
      );
      await movementRepo.save(mov);
    }

    // 3 ATTENDED_AT_COORDINATION
    for (let i = 0; i < 3; i++) {
      const mov = MovementRecord.create({
        sessionId: 'sess-1',
        studentId: `300${i}`,
        studentRa: `300${i}`,
        studentFullName: `Aluno ${i}`,
        classCode: '2B',
        subject: 'História',
        startedAt: new Date('2026-03-10T09:10:00.000Z'),
      });
      mov.resolve(
        IncidentOutcome.ATTENDED_AT_COORDINATION,
        'coord-1',
        new Date('2026-03-10T09:25:00.000Z'),
      );
      await movementRepo.save(mov);
    }

    // 1 EVASION
    const movEvasion = MovementRecord.create({
      sessionId: 'sess-1',
      studentId: '4001',
      studentRa: '4001',
      studentFullName: 'Aluno Evasão',
      classCode: '3C',
      subject: 'Geografia',
      startedAt: new Date('2026-03-10T10:00:00.000Z'),
    });
    movEvasion.resolve(
      IncidentOutcome.EVASION,
      'coord-1',
      new Date('2026-03-10T10:45:00.000Z'),
    );
    await movementRepo.save(movEvasion);

    const result = await useCase.execute();

    // Total finished = 4 + 2 + 3 + 1 = 10
    const returned = result.outcomeDistribution.find(
      (o) =>
        o.outcome === 'RETURNED_NORMAL' ||
        o.outcome === IncidentOutcome.RETURNED_TO_CLASS,
    );
    const infirmary = result.outcomeDistribution.find(
      (o) => o.outcome === IncidentOutcome.SENT_TO_INFIRMARY,
    );
    const coordination = result.outcomeDistribution.find(
      (o) => o.outcome === IncidentOutcome.ATTENDED_AT_COORDINATION,
    );
    const evasion = result.outcomeDistribution.find(
      (o) => o.outcome === IncidentOutcome.EVASION,
    );

    expect(returned?.count).toBe(4);
    expect(returned?.percentage).toBe(40);

    expect(infirmary?.count).toBe(2);
    expect(infirmary?.percentage).toBe(20);

    expect(coordination?.count).toBe(3);
    expect(coordination?.percentage).toBe(30);

    expect(evasion?.count).toBe(1);
    expect(evasion?.percentage).toBe(10);
  });

  it('filters analytics by classCode and date range correctly', async () => {
    const useCase = new GetSchoolOverviewAnalyticsUseCase(movementRepo, {
      clock: () => fixedClock,
    });

    // 1A on 2026-03-10
    const mov1 = MovementRecord.create({
      sessionId: 'sess-1',
      studentId: '1001',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'Matemática',
      startedAt: new Date('2026-03-10T08:00:00.000Z'),
    });
    mov1.registerReturn(new Date('2026-03-10T08:05:00.000Z'), 50);
    await movementRepo.save(mov1);

    // 2B on 2026-03-10
    const mov2 = MovementRecord.create({
      sessionId: 'sess-2',
      studentId: '2001',
      studentRa: '2001',
      studentFullName: 'Pedro Alves',
      classCode: '2B',
      subject: 'História',
      startedAt: new Date('2026-03-10T09:00:00.000Z'),
    });
    mov2.registerReturn(new Date('2026-03-10T09:15:00.000Z'), 50);
    await movementRepo.save(mov2);

    // Filter by classCode '1A'
    const classFiltered = await useCase.execute({ classCode: '1A' });
    expect(classFiltered.stats.totalExitsToday).toBe(1);
    expect(classFiltered.stats.averageOutsideMinutes).toBe(5);

    // Filter by classCode '2B'
    const class2BFiltered = await useCase.execute({ classCode: '2B' });
    expect(class2BFiltered.stats.totalExitsToday).toBe(1);
    expect(class2BFiltered.stats.averageOutsideMinutes).toBe(15);
  });
});
