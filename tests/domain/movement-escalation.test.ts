import { MovementRecord } from '@server/domain/entities/MovementRecord';
import { Student } from '@server/domain/entities/Student';
import { AlertLevel, MovementStatus } from '@shared/enums';
import { describe, expect, it } from 'vitest';

describe('Domain Seam: Time Limit Monitoring, Medical Tempo Especial & 2-Minute Hybrid Escalation', () => {
  it('resolves effective time limit using class default for regular students and specialTimeLimitMinutes for medical Tempo Especial students', () => {
    const regularStudent = Student.create({
      id: 'student-1',
      ra: '1001',
      fullName: 'Lucas Silva',
      classCode: '1A',
    });

    const specialStudent = Student.create({
      id: 'student-3',
      ra: '1003',
      fullName: 'Ana Costa',
      classCode: '1A',
      specialTimeLimitMinutes: 20,
    });

    expect(regularStudent.hasSpecialTimeLimit()).toBe(false);
    expect(regularStudent.getEffectiveTimeLimitMinutes(10)).toBe(10);

    expect(specialStudent.hasSpecialTimeLimit()).toBe(true);
    expect(specialStudent.getEffectiveTimeLimitMinutes(10)).toBe(20);
  });

  it('computes AlertLevel transitions (GREEN < 80%, YELLOW >= 80% and <= 100%, RED > 100%) respecting regular and medical Tempo Especial limits', () => {
    const startedAt = new Date('2026-03-10T08:00:00.000Z');

    const regularMovement = MovementRecord.create({
      id: 'mov-reg',
      sessionId: 'session-1',
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'Matemática',
      startedAt,
      allowedLimitMinutes: 10,
    });

    const medicalMovement = MovementRecord.create({
      id: 'mov-med',
      sessionId: 'session-1',
      studentId: 'student-3',
      studentRa: '1003',
      studentFullName: 'Ana Costa',
      classCode: '1A',
      subject: 'Matemática',
      startedAt,
      allowedLimitMinutes: 20,
    });

    // At 7 minutes: regular is 70% (GREEN), medical is 35% (GREEN)
    const at7Min = new Date('2026-03-10T08:07:00.000Z');
    expect(regularMovement.getAlertLevel(at7Min)).toBe(AlertLevel.GREEN);
    expect(regularMovement.isWarningThresholdReached(at7Min)).toBe(false);
    expect(regularMovement.isOverdueThresholdReached(at7Min)).toBe(false);
    expect(medicalMovement.getAlertLevel(at7Min)).toBe(AlertLevel.GREEN);

    // At 8 minutes: regular reaches 80% (YELLOW), medical is at 40% (GREEN)
    const at8Min = new Date('2026-03-10T08:08:00.000Z');
    expect(regularMovement.getAlertLevel(at8Min)).toBe(AlertLevel.YELLOW);
    expect(regularMovement.isWarningThresholdReached(at8Min)).toBe(true);
    expect(regularMovement.isOverdueThresholdReached(at8Min)).toBe(false);
    expect(medicalMovement.getAlertLevel(at8Min)).toBe(AlertLevel.GREEN);

    // At 10 minutes: regular is at 100% (still YELLOW boundary), medical is at 50% (GREEN)
    const at10Min = new Date('2026-03-10T08:10:00.000Z');
    expect(regularMovement.getAlertLevel(at10Min)).toBe(AlertLevel.YELLOW);
    expect(regularMovement.isOverdueThresholdReached(at10Min)).toBe(false);
    expect(medicalMovement.getAlertLevel(at10Min)).toBe(AlertLevel.GREEN);

    // At 11 minutes: regular exceeds 100% (RED), medical is at 55% (still GREEN!)
    const at11Min = new Date('2026-03-10T08:11:00.000Z');
    expect(regularMovement.getAlertLevel(at11Min)).toBe(AlertLevel.RED);
    expect(regularMovement.isOverdueThresholdReached(at11Min)).toBe(true);
    expect(medicalMovement.getAlertLevel(at11Min)).toBe(AlertLevel.GREEN);

    // At 16 minutes: medical reaches 80% of 20 min (YELLOW)
    const at16Min = new Date('2026-03-10T08:16:00.000Z');
    expect(medicalMovement.getAlertLevel(at16Min)).toBe(AlertLevel.YELLOW);
    expect(medicalMovement.isWarningThresholdReached(at16Min)).toBe(true);

    // At 21 minutes: medical exceeds 100% of 20 min (RED)
    const at21Min = new Date('2026-03-10T08:21:00.000Z');
    expect(medicalMovement.getAlertLevel(at21Min)).toBe(AlertLevel.RED);
    expect(medicalMovement.isOverdueThresholdReached(at21Min)).toBe(true);
  });

  it('opens a 2-minute teacher grace window when marked OVERDUE and transitions to ESCALATED_TO_COORDINATION (MANUAL or AUTOMATIC)', () => {
    const startedAt = new Date('2026-03-10T08:00:00.000Z');
    const overdueAt = new Date('2026-03-10T08:10:30.000Z');

    const movement = MovementRecord.create({
      id: 'mov-esc-1',
      sessionId: 'session-1',
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'Matemática',
      startedAt,
      allowedLimitMinutes: 10,
    });

    movement.markOverdue(overdueAt);

    expect(movement.status).toBe(MovementStatus.OVERDUE);
    expect(movement.overdueAt).toEqual(overdueAt);
    expect(movement.graceEndsAt).toEqual(new Date('2026-03-10T08:12:30.000Z'));

    // 1 minute 59 seconds after overdueAt -> grace window not yet expired
    expect(
      movement.isGraceWindowExpired(new Date('2026-03-10T08:12:29.000Z')),
    ).toBe(false);

    // Exactly 2 minutes after overdueAt -> grace window expired
    const autoEscalateAt = new Date('2026-03-10T08:12:30.000Z');
    expect(movement.isGraceWindowExpired(autoEscalateAt)).toBe(true);

    movement.escalate(autoEscalateAt, 'AUTOMATIC');

    expect(movement.status).toBe(MovementStatus.ESCALATED_TO_COORDINATION);
    expect(movement.escalatedAt).toEqual(autoEscalateAt);
    expect(movement.escalationType).toBe('AUTOMATIC');
    expect(movement.getAlertLevel(autoEscalateAt)).toBe(AlertLevel.RED);

    // Rejects escalating a movement that has already returned
    const returnedMovement = MovementRecord.create({
      id: 'mov-returned',
      sessionId: 'session-1',
      studentId: 'student-2',
      studentRa: '1002',
      studentFullName: 'João Mendes',
      classCode: '1A',
      subject: 'Matemática',
      startedAt,
      allowedLimitMinutes: 10,
    });
    returnedMovement.registerReturn(new Date('2026-03-10T08:05:00.000Z'), 50);

    expect(() =>
      returnedMovement.escalate(new Date('2026-03-10T08:06:00.000Z'), 'MANUAL'),
    ).toThrow(/encerrad|ativo/i);
  });
});
