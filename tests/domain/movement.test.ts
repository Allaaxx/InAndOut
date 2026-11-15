import { describe, it, expect } from 'vitest';
import { StudentRA } from '@server/domain/value-objects/StudentRA';
import { Student } from '@server/domain/entities/Student';
import { MovementRecord } from '@server/domain/entities/MovementRecord';
import { AlertLevel, MovementStatus } from '@shared/enums';

describe('Domain Seam: StudentRA, Student & MovementRecord', () => {
  it('validates and normalizes StudentRA and rejects invalid or empty values', () => {
    const ra = StudentRA.create('  1001  ');
    expect(ra.value).toBe('1001');
    expect(ra.toString()).toBe('1001');
    expect(ra.equals('1001')).toBe(true);
    expect(ra.equals(StudentRA.create('1001'))).toBe(true);
    expect(ra.equals('1002')).toBe(false);

    expect(() => StudentRA.create('   ')).toThrow(/RA/i);
    expect(() => StudentRA.create('ABC-123')).toThrow(/RA/i);
  });

  it('creates a Student entity with LGPD abbreviated display name (first name + last initial)', () => {
    const student1 = Student.create({
      id: 'student-1',
      ra: '1001',
      fullName: 'Lucas Silva',
      classCode: '1A',
    });

    expect(student1.id).toBe('student-1');
    expect(student1.ra).toBe('1001');
    expect(student1.fullName).toBe('Lucas Silva');
    expect(student1.publicName).toBe('Lucas S.');
    expect(student1.abbreviatedName).toBe('Lucas S.');
    expect(student1.classCode).toBe('1A');
    expect(student1.specialTimeLimitMinutes).toBeUndefined();

    const student2 = Student.create({
      id: 'student-3',
      ra: '1003',
      fullName: 'Maria Eduarda Santos',
      classCode: '1A',
      specialTimeLimitMinutes: 20,
    });

    expect(student2.publicName).toBe('Maria S.');
    expect(student2.abbreviatedName).toBe('Maria S.');
    expect(student2.specialTimeLimitMinutes).toBe(20);
    expect(student2.toDTO()).toMatchObject({
      id: 'student-3',
      ra: '1003',
      fullName: 'Maria Eduarda Santos',
      publicName: 'Maria S.',
      abbreviatedName: 'Maria S.',
      classCode: '1A',
      specialTimeLimitMinutes: 20,
    });
  });

  it('creates a MovementRecord in IN_TRANSIT status with timestamps and allowed time limits', () => {
    const startedAt = new Date('2026-03-10T08:15:00.000Z');
    const movement = MovementRecord.create({
      id: 'mov-1',
      sessionId: 'session-1',
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'Matemática',
      roomId: 'SALA-01',
      teacherName: 'Prof. Carlos Eduardo',
      allowedLimitMinutes: 10,
      startedAt,
    });

    expect(movement.id).toBe('mov-1');
    expect(movement.sessionId).toBe('session-1');
    expect(movement.studentId).toBe('student-1');
    expect(movement.studentRa).toBe('1001');
    expect(movement.studentFullName).toBe('Lucas Silva');
    expect(movement.studentPublicName).toBe('Lucas S.');
    expect(movement.abbreviatedName).toBe('Lucas S.');
    expect(movement.status).toBe(MovementStatus.IN_TRANSIT);
    expect(movement.startedAt).toEqual(startedAt);
    expect(movement.endedAt).toBeUndefined();
    expect(movement.allowedLimitMinutes).toBe(10);
    expect(movement.isActive()).toBe(true);
    expect(movement.getAlertLevel(new Date('2026-03-10T08:18:00.000Z'))).toBe(
      AlertLevel.GREEN
    );

    const dto = movement.toDTO(new Date('2026-03-10T08:18:00.000Z'));
    expect(dto).toMatchObject({
      id: 'mov-1',
      sessionId: 'session-1',
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      studentPublicName: 'Lucas S.',
      abbreviatedName: 'Lucas S.',
      classCode: '1A',
      subject: 'Matemática',
      status: MovementStatus.IN_TRANSIT,
      alertLevel: AlertLevel.GREEN,
      startedAt: '2026-03-10T08:15:00.000Z',
      allowedLimitMinutes: 10,
      elapsedMinutes: 3,
      isEmergency: false,
      isGuest: false,
    });
  });
});
