import { describe, it, expect, vi } from 'vitest';
import { MovementRecord } from '@server/domain/entities/MovementRecord';
import { IncidentOutcome, MovementStatus } from '@shared/enums';
import { InMemoryMovementRecordRepository } from '@server/infrastructure/repositories/InMemoryMovementRecordRepository';
import {
  MovementNotFoundError,
  ResolveMovementIncidentUseCase,
} from '@server/application/use-cases/coordination/ResolveMovementIncidentUseCase';
import { INotificationSender } from '@server/application/contracts/INotificationSender';

describe('Domain Seam: Movement Resolution & Saída em Trânsito (MovementRecord & ResolveMovementIncidentUseCase)', () => {
  it('converts an active movement to IN_TRANSIT_UNRESOLVED and preserves original exit information', () => {
    const startedAt = new Date('2026-03-10T08:00:00.000Z');
    const movement = MovementRecord.create({
      id: 'mov-1',
      sessionId: 'session-100',
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'Matemática',
      roomId: 'SALA-01',
      startedAt,
      allowedLimitMinutes: 10,
    });

    expect(movement.status).toBe(MovementStatus.IN_TRANSIT);
    expect(movement.isActive()).toBe(true);

    movement.markInTransitUnresolved();

    expect(movement.status).toBe(MovementStatus.IN_TRANSIT_UNRESOLVED);
    const dto = movement.toDTO();
    expect(dto.status).toBe(MovementStatus.IN_TRANSIT_UNRESOLVED);
    expect(dto.studentPublicName).toBe('Lucas S.');
    expect(dto.classCode).toBe('1A');
  });

  it('resolves an incident with typed outcome, coordinator ID, resolution notes, and duration calculation', () => {
    const startedAt = new Date('2026-03-10T08:00:00.000Z');
    const resolvedAt = new Date('2026-03-10T08:25:00.000Z'); // 25 minutes later
    const movement = MovementRecord.create({
      id: 'mov-2',
      sessionId: 'session-100',
      studentId: 'student-2',
      studentRa: '1002',
      studentFullName: 'João Mendes',
      classCode: '1A',
      subject: 'Matemática',
      startedAt,
      allowedLimitMinutes: 10,
    });

    movement.markInTransitUnresolved();

    movement.resolve(
      IncidentOutcome.ATTENDED_AT_COORDINATION,
      'coord-42',
      resolvedAt,
      'Aluno foi orientado pela coordenação pedagógica.',
      50
    );

    expect(movement.status).toBe(MovementStatus.RESOLVED);
    expect(movement.outcome).toBe(IncidentOutcome.ATTENDED_AT_COORDINATION);
    expect(movement.resolvedByCoordinatorId).toBe('coord-42');
    expect(movement.resolutionNotes).toBe(
      'Aluno foi orientado pela coordenação pedagógica.'
    );
    expect(movement.resolvedAt).toEqual(resolvedAt);

    const dto = movement.toDTO(resolvedAt);
    expect(dto.status).toBe(MovementStatus.RESOLVED);
    expect(dto.outcome).toBe(IncidentOutcome.ATTENDED_AT_COORDINATION);
    expect(dto.resolvedByCoordinatorId).toBe('coord-42');
    expect(dto.durationMinutes).toBe(25);
    expect(dto.attendedMinutes).toBe(25); // 50 - 25
    expect(dto.attendancePercentage).toBe(50);
  });

  it('executes ResolveMovementIncidentUseCase successfully and notifies via INotificationSender', async () => {
    const movementRepo = new InMemoryMovementRecordRepository();
    const notificationSender: INotificationSender = {
      notifyMovementExit: vi.fn(),
      notifyMovementReturn: vi.fn(),
      notifyQueueUpdated: vi.fn(),
      notifyQueueSlotCalled: vi.fn(),
      notifyMovementOverdue: vi.fn(),
      notifyMovementEscalated: vi.fn(),
      notifyMovementInTransitUnresolved: vi.fn(),
      notifyMovementResolved: vi.fn(),
    };

    const startedAt = new Date('2026-03-10T08:00:00.000Z');
    const resolvedAt = new Date('2026-03-10T08:30:00.000Z');
    const movement = MovementRecord.create({
      id: 'mov-3',
      sessionId: 'session-100',
      studentId: 'student-3',
      studentRa: '1003',
      studentFullName: 'Ana Costa',
      classCode: '1A',
      subject: 'Matemática',
      startedAt,
      allowedLimitMinutes: 10,
    });
    movement.escalate(new Date('2026-03-10T08:15:00.000Z'), 'MANUAL');
    await movementRepo.save(movement);

    const useCase = new ResolveMovementIncidentUseCase(movementRepo, {
      notificationSender,
      clock: () => resolvedAt,
    });

    const result = await useCase.execute({
      movementId: 'mov-3',
      coordinatorId: 'coord-1',
      outcome: IncidentOutcome.SENT_TO_INFIRMARY,
      notes: 'Encaminhada à enfermaria com queixa de cefaleia.',
    });

    expect(result.movement.status).toBe(MovementStatus.RESOLVED);
    expect(result.movement.outcome).toBe(IncidentOutcome.SENT_TO_INFIRMARY);
    expect(result.movement.resolvedByCoordinatorId).toBe('coord-1');
    expect(result.movement.resolutionNotes).toBe(
      'Encaminhada à enfermaria com queixa de cefaleia.'
    );

    const updated = await movementRepo.findById('mov-3');
    expect(updated?.status).toBe(MovementStatus.RESOLVED);
    expect(updated?.outcome).toBe(IncidentOutcome.SENT_TO_INFIRMARY);

    expect(notificationSender.notifyMovementResolved).toHaveBeenCalledTimes(1);
    expect(notificationSender.notifyMovementResolved).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mov-3',
        status: MovementStatus.RESOLVED,
        outcome: IncidentOutcome.SENT_TO_INFIRMARY,
      })
    );
  });

  it('throws MovementNotFoundError when attempting to resolve a non-existent movement', async () => {
    const movementRepo = new InMemoryMovementRecordRepository();
    const useCase = new ResolveMovementIncidentUseCase(movementRepo);

    await expect(
      useCase.execute({
        movementId: 'mov-non-existent',
        coordinatorId: 'coord-1',
        outcome: IncidentOutcome.RETURNED_TO_CLASS,
      })
    ).rejects.toThrow(MovementNotFoundError);
  });

  it('EndClassSessionUseCase automatically converts active movements to IN_TRANSIT_UNRESOLVED and broadcasts events', async () => {
    const { InMemoryClassSessionRepository } = await import(
      '@server/infrastructure/repositories/InMemoryClassSessionRepository'
    );
    const { ClassSession } = await import('@server/domain/entities/ClassSession');
    const { EndClassSessionUseCase } = await import(
      '@server/application/use-cases/sessions/EndClassSessionUseCase'
    );

    const sessionRepo = new InMemoryClassSessionRepository();
    const movementRepo = new InMemoryMovementRecordRepository();
    const notificationSender: INotificationSender = {
      notifyMovementExit: vi.fn(),
      notifyMovementReturn: vi.fn(),
      notifyQueueUpdated: vi.fn(),
      notifyQueueSlotCalled: vi.fn(),
      notifyMovementOverdue: vi.fn(),
      notifyMovementEscalated: vi.fn(),
      notifyMovementInTransitUnresolved: vi.fn(),
      notifyMovementResolved: vi.fn(),
    };

    const startTime = new Date('2026-03-10T08:00:00.000Z');
    const endTime = new Date('2026-03-10T08:50:00.000Z');

    const session = ClassSession.create({
      id: 'session-1',
      teacherId: 'teacher-1',
      teacherName: 'Prof. Carlos',
      roomId: 'SALA-01',
      classCode: '1A',
      subject: 'Matemática',
      startedAt: startTime,
    });
    await sessionRepo.save(session);

    // Active exit 1 (IN_TRANSIT)
    const mov1 = MovementRecord.create({
      id: 'mov-1',
      sessionId: 'session-1',
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'Matemática',
      roomId: 'SALA-01',
      startedAt: new Date('2026-03-10T08:42:00.000Z'),
      allowedLimitMinutes: 10,
    });
    await movementRepo.save(mov1);

    // Overdue exit 2 (OVERDUE)
    const mov2 = MovementRecord.create({
      id: 'mov-2',
      sessionId: 'session-1',
      studentId: 'student-2',
      studentRa: '1002',
      studentFullName: 'João Mendes',
      classCode: '1A',
      subject: 'Matemática',
      roomId: 'SALA-01',
      startedAt: new Date('2026-03-10T08:15:00.000Z'),
      allowedLimitMinutes: 10,
    });
    mov2.markOverdue(new Date('2026-03-10T08:26:00.000Z'));
    await movementRepo.save(mov2);

    // Finished exit 3 (RETURNED_NORMAL)
    const mov3 = MovementRecord.create({
      id: 'mov-3',
      sessionId: 'session-1',
      studentId: 'student-3',
      studentRa: '1003',
      studentFullName: 'Ana Costa',
      classCode: '1A',
      subject: 'Matemática',
      roomId: 'SALA-01',
      startedAt: new Date('2026-03-10T08:05:00.000Z'),
      allowedLimitMinutes: 10,
    });
    mov3.registerReturn(new Date('2026-03-10T08:12:00.000Z'));
    await movementRepo.save(mov3);

    const endUseCase = new EndClassSessionUseCase(sessionRepo, {
      movementRepo,
      notificationSender,
      clock: () => endTime,
    });

    const response = await endUseCase.execute({ sessionId: 'session-1' });

    expect(response.session.status).toBe('ENDED');
    expect(response.metrics.totalExits).toBe(3);
    expect(response.metrics.inTransitUnresolvedCount).toBe(2);
    expect(response.inTransitMovements).toHaveLength(2);
    expect(response.inTransitMovements.map((m) => m.id)).toEqual(
      expect.arrayContaining(['mov-1', 'mov-2'])
    );

    const updatedMov1 = await movementRepo.findById('mov-1');
    const updatedMov2 = await movementRepo.findById('mov-2');
    const updatedMov3 = await movementRepo.findById('mov-3');

    expect(updatedMov1?.status).toBe(MovementStatus.IN_TRANSIT_UNRESOLVED);
    expect(updatedMov2?.status).toBe(MovementStatus.IN_TRANSIT_UNRESOLVED);
    expect(updatedMov3?.status).toBe(MovementStatus.RETURNED_NORMAL);

    expect(notificationSender.notifyMovementInTransitUnresolved).toHaveBeenCalledTimes(2);
  });
});
