import { MovementRecord } from '@server/domain/entities/MovementRecord';
import { DurationMinutes } from '@server/domain/value-objects/DurationMinutes';
import { MovementStatus } from '@shared/enums';
import { describe, expect, it } from 'vitest';

describe('Domain Seam: DurationMinutes & MovementRecord Return Calculation', () => {
  it('calculates exact outside duration, attended minutes, and attendance percentage in DurationMinutes', () => {
    const startedAt = new Date('2026-03-10T08:10:00.000Z');
    const endedAt = new Date('2026-03-10T08:15:00.000Z');

    const duration = DurationMinutes.fromDates(startedAt, endedAt, 50);

    expect(duration.durationMinutes).toBe(5);
    expect(duration.outsideMinutes).toBe(5);
    expect(duration.plannedMinutes).toBe(50);
    expect(duration.attendedMinutes).toBe(45);
    expect(duration.attendancePercentage).toBe(90);

    // Fractional minutes: 7 minutes and 30 seconds (7.5 min) in a 50-minute class -> 42.5 min attended (85%)
    const fractional = DurationMinutes.fromDates(
      new Date('2026-03-10T08:00:00.000Z'),
      new Date('2026-03-10T08:07:30.000Z'),
      50,
    );
    expect(fractional.durationMinutes).toBe(7.5);
    expect(fractional.attendedMinutes).toBe(42.5);
    expect(fractional.attendancePercentage).toBe(85);
  });

  it('clamps attendedMinutes and attendancePercentage at 0 when absence exceeds planned session duration and rejects invalid dates', () => {
    const duration = DurationMinutes.fromDates(
      new Date('2026-03-10T08:00:00.000Z'),
      new Date('2026-03-10T09:05:00.000Z'),
      50,
    );

    expect(duration.durationMinutes).toBe(65);
    expect(duration.attendedMinutes).toBe(0);
    expect(duration.attendancePercentage).toBe(0);

    // Rejects return timestamp earlier than exit timestamp
    expect(() =>
      DurationMinutes.fromDates(
        new Date('2026-03-10T08:10:00.000Z'),
        new Date('2026-03-10T08:05:00.000Z'),
        50,
      ),
    ).toThrow(/anterior|inválid/i);
  });

  it('transitions MovementRecord to RETURNED_NORMAL on registerReturn, computes attendance metrics, and prevents duplicate returns', () => {
    const startedAt = new Date('2026-03-10T08:10:00.000Z');
    const endedAt = new Date('2026-03-10T08:18:00.000Z'); // 8 minutes out of 50 -> 42 min attended (84%)

    const movement = MovementRecord.create({
      id: 'mov-return-1',
      sessionId: 'session-1',
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'Matemática',
      startedAt,
      allowedLimitMinutes: 10,
    });

    expect(movement.isActive()).toBe(true);

    movement.registerReturn(endedAt, 50);

    expect(movement.status).toBe(MovementStatus.RETURNED_NORMAL);
    expect(movement.isActive()).toBe(false);
    expect(movement.endedAt).toEqual(endedAt);
    expect(movement.durationMinutes).toBe(8);
    expect(movement.attendedMinutes).toBe(42);
    expect(movement.attendancePercentage).toBe(84);

    const dto = movement.toDTO(endedAt);
    expect(dto).toMatchObject({
      id: 'mov-return-1',
      studentRa: '1001',
      studentPublicName: 'Lucas S.',
      status: MovementStatus.RETURNED_NORMAL,
      startedAt: '2026-03-10T08:10:00.000Z',
      endedAt: '2026-03-10T08:18:00.000Z',
      durationMinutes: 8,
      attendedMinutes: 42,
      attendancePercentage: 84,
    });

    // Cannot register return twice on an already returned record
    expect(() => movement.registerReturn(endedAt, 50)).toThrow(
      /já foi encerrado|ativo/i,
    );
  });
});
