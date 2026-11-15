import { GetSchoolOverviewAnalyticsUseCase } from '@server/application/use-cases/analytics/GetSchoolOverviewAnalyticsUseCase';
import { MovementRecord } from '@server/domain/entities/MovementRecord';
import { InMemoryMovementRecordRepository } from '@server/infrastructure/repositories/InMemoryMovementRecordRepository';
import { MovementStatus } from '@shared/enums';
import { describe, expect, it } from 'vitest';

describe('Domain Seam: Class Comparison Analytics (User Story 25)', () => {
  it('calculates departure frequency, total outside time, and average duration per class', async () => {
    const movementRepo = new InMemoryMovementRecordRepository();
    const now = new Date('2026-03-10T12:00:00.000Z');
    const useCase = new GetSchoolOverviewAnalyticsUseCase(movementRepo, {
      clock: () => now,
    });

    // 2 movements for class 1A
    const mov1A_1 = MovementRecord.create({
      sessionId: 'session-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'Matemática',
      startedAt: new Date('2026-03-10T08:00:00.000Z'),
      status: MovementStatus.RETURNED_NORMAL,
      durationMinutes: 6,
    });
    const mov1A_2 = MovementRecord.create({
      sessionId: 'session-1',
      studentRa: '1002',
      studentFullName: 'João Mendes',
      classCode: '1A',
      subject: 'Matemática',
      startedAt: new Date('2026-03-10T08:20:00.000Z'),
      status: MovementStatus.RETURNED_NORMAL,
      durationMinutes: 8,
    });

    // 1 movement for class 2B
    const mov2B_1 = MovementRecord.create({
      sessionId: 'session-2',
      studentRa: '2001',
      studentFullName: 'Mariana Costa',
      classCode: '2B',
      subject: 'História',
      startedAt: new Date('2026-03-10T09:00:00.000Z'),
      status: MovementStatus.RETURNED_NORMAL,
      durationMinutes: 15,
    });

    await movementRepo.save(mov1A_1);
    await movementRepo.save(mov1A_2);
    await movementRepo.save(mov2B_1);

    const result = await useCase.execute();

    expect(result.classComparison).toBeDefined();
    expect(result.classComparison).toHaveLength(2);

    const class1A = result.classComparison?.find((c) => c.classCode === '1A');
    expect(class1A).toEqual({
      classCode: '1A',
      totalExits: 2,
      totalOutsideMinutes: 14,
      averageOutsideMinutes: 7,
    });

    const class2B = result.classComparison?.find((c) => c.classCode === '2B');
    expect(class2B).toEqual({
      classCode: '2B',
      totalExits: 1,
      totalOutsideMinutes: 15,
      averageOutsideMinutes: 15,
    });
  });
});
