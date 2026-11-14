import { describe, it, expect } from 'vitest';
import { InMemoryMovementRecordRepository } from '@server/infrastructure/repositories/InMemoryMovementRecordRepository';
import { MovementRecord } from '@server/domain/entities/MovementRecord';
import { GetActiveMovementsOverviewUseCase } from '@server/application/use-cases/coordination/GetActiveMovementsOverviewUseCase';
import { AlertLevel, MovementStatus } from '@shared/enums';

describe('Domain Seam: GetActiveMovementsOverviewUseCase', () => {
  it('retrieves all active movements across multiple classes with accurate elapsed time and alert level', async () => {
    const movementRepo = new InMemoryMovementRecordRepository();
    const startTime = new Date('2026-03-10T08:00:00.000Z');
    const currentTime = new Date('2026-03-10T08:09:00.000Z'); // 9 mins later

    // Active movement in Class 1A (9 mins / 10 limit = 90% -> YELLOW)
    const mov1 = MovementRecord.create({
      id: 'mov-1',
      sessionId: 'session-1',
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'Matemática',
      roomId: 'SALA-01',
      startedAt: startTime,
      allowedLimitMinutes: 10,
    });

    // Active movement in Class 2B (9 mins / 20 limit = 45% -> GREEN)
    const mov2 = MovementRecord.create({
      id: 'mov-2',
      sessionId: 'session-2',
      studentId: 'student-2',
      studentRa: '2001',
      studentFullName: 'Pedro Alves',
      classCode: '2B',
      subject: 'História',
      roomId: 'SALA-02',
      startedAt: startTime,
      allowedLimitMinutes: 20,
    });

    // Escalated movement in Class 3C
    const mov3 = MovementRecord.create({
      id: 'mov-3',
      sessionId: 'session-3',
      studentId: 'student-3',
      studentRa: '3001',
      studentFullName: 'Beatriz Lima',
      classCode: '3C',
      subject: 'Física',
      roomId: 'SALA-03',
      startedAt: startTime,
      allowedLimitMinutes: 5,
    });
    mov3.escalate(currentTime, 'MANUAL', 'Demorou mais de 5 minutos');

    // Finished movement in Class 1A (RETURNED_NORMAL)
    const mov4 = MovementRecord.create({
      id: 'mov-4',
      sessionId: 'session-1',
      studentId: 'student-4',
      studentRa: '1002',
      studentFullName: 'João Mendes',
      classCode: '1A',
      subject: 'Matemática',
      roomId: 'SALA-01',
      startedAt: startTime,
      allowedLimitMinutes: 10,
    });
    mov4.registerReturn(new Date('2026-03-10T08:05:00.000Z'));

    await movementRepo.save(mov1);
    await movementRepo.save(mov2);
    await movementRepo.save(mov3);
    await movementRepo.save(mov4);

    const useCase = new GetActiveMovementsOverviewUseCase(movementRepo, {
      clock: () => currentTime,
    });

    const result = await useCase.execute();

    expect(result.movements).toHaveLength(3);
    const ids = result.movements.map((m) => m.id);
    expect(ids).toContain('mov-1');
    expect(ids).toContain('mov-2');
    expect(ids).toContain('mov-3');
    expect(ids).not.toContain('mov-4');

    const mov1DTO = result.movements.find((m) => m.id === 'mov-1')!;
    expect(mov1DTO.studentPublicName).toBe('Lucas S.');
    expect(mov1DTO.classCode).toBe('1A');
    expect(mov1DTO.elapsedMinutes).toBe(9);
    expect(mov1DTO.alertLevel).toBe(AlertLevel.YELLOW);

    const mov3DTO = result.movements.find((m) => m.id === 'mov-3')!;
    expect(mov3DTO.status).toBe(MovementStatus.ESCALATED_TO_COORDINATION);
    expect(mov3DTO.alertLevel).toBe(AlertLevel.RED);
    expect(mov3DTO.escalationType).toBe('MANUAL');
  });

  it('filters movements by classCode and by status', async () => {
    const movementRepo = new InMemoryMovementRecordRepository();
    const now = new Date('2026-03-10T08:00:00.000Z');

    const mov1 = MovementRecord.create({
      id: 'mov-1',
      sessionId: 'session-1',
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'Matemática',
      startedAt: now,
    });

    const mov2 = MovementRecord.create({
      id: 'mov-2',
      sessionId: 'session-2',
      studentId: 'student-2',
      studentRa: '2001',
      studentFullName: 'Pedro Alves',
      classCode: '2B',
      subject: 'História',
      startedAt: now,
    });
    mov2.escalate(now, 'AUTOMATIC');

    await movementRepo.save(mov1);
    await movementRepo.save(mov2);

    const useCase = new GetActiveMovementsOverviewUseCase(movementRepo, {
      clock: () => now,
    });

    // Filter by classCode
    const classFiltered = await useCase.execute({ classCode: '1A' });
    expect(classFiltered.movements).toHaveLength(1);
    expect(classFiltered.movements[0].id).toBe('mov-1');

    // Filter by status
    const statusFiltered = await useCase.execute({
      status: MovementStatus.ESCALATED_TO_COORDINATION,
    });
    expect(statusFiltered.movements).toHaveLength(1);
    expect(statusFiltered.movements[0].id).toBe('mov-2');
  });

  it('includes in-transit unresolved movements when session ends', async () => {
    const movementRepo = new InMemoryMovementRecordRepository();
    const now = new Date('2026-03-10T08:00:00.000Z');

    const unresolvedMov = MovementRecord.create({
      id: 'mov-unresolved',
      sessionId: 'session-old',
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'História',
      startedAt: now,
    });
    unresolvedMov.markInTransitUnresolved();

    await movementRepo.save(unresolvedMov);

    const useCase = new GetActiveMovementsOverviewUseCase(movementRepo, {
      clock: () => now,
    });

    const result = await useCase.execute();
    expect(result.movements).toHaveLength(1);
    expect(result.movements[0].status).toBe(MovementStatus.IN_TRANSIT_UNRESOLVED);
  });
});
