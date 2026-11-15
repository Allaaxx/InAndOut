import { ClassSession } from '@server/domain/entities/ClassSession';
import { MovementRecord } from '@server/domain/entities/MovementRecord';
import { createApp } from '@server/main/app';
import { MovementStatus } from '@shared/enums';
import { describe, expect, it, vi } from 'vitest';

describe('Server Seam: Automatic Overdue Escalation Timer (User Story 17)', () => {
  it('automatically triggers evaluateOverdueMovements on the configured interval and supports graceful stop', async () => {
    vi.useFakeTimers();

    const startTime = new Date('2026-03-10T08:00:00.000Z');
    let currentTime = new Date(startTime);

    const { app, container, stopBackgroundTimer } = await createApp(
      { clock: () => currentTime },
      { enableBackgroundTimer: true, autoEvaluateIntervalMs: 1000 },
    );

    const session = ClassSession.create({
      id: 'session-timer-1',
      teacherId: 'teacher-1',
      teacherName: 'Prof. Carlos',
      roomId: 'SALA-01',
      classCode: '1A',
      subject: 'História',
      startedAt: startTime,
    });
    await container.sessionRepo.save(session);

    // Movement started at 08:00, marked overdue at 08:10 (limit 10m)
    const overdueAt = new Date(startTime.getTime() + 10 * 60_000);
    const movement = MovementRecord.create({
      id: 'mov-overdue-timer-1',
      sessionId: session.id,
      studentId: '1001',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      classCode: '1A',
      subject: 'História',
      roomId: 'SALA-01',
      startedAt: startTime,
      allowedLimitMinutes: 10,
      status: MovementStatus.OVERDUE,
      overdueAt,
    });
    await container.movementRepo.save(movement);

    // Current time is 08:13 (3 minutes after overdueAt: grace period of 2m has expired)
    currentTime = new Date(startTime.getTime() + 13 * 60_000);

    const notifyEscalatedSpy = vi.spyOn(
      container.notificationSender,
      'notifyMovementEscalated',
    );

    // Advance timer by 1 second to trigger interval
    await vi.advanceTimersByTimeAsync(1000);

    expect(notifyEscalatedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: movement.id,
        status: MovementStatus.ESCALATED_TO_COORDINATION,
        escalationType: 'AUTOMATIC',
      }),
    );

    const updated = await container.movementRepo.findById(movement.id);
    expect(updated?.status).toBe(MovementStatus.ESCALATED_TO_COORDINATION);
    expect(updated?.escalationType).toBe('AUTOMATIC');

    // Clean up timer
    stopBackgroundTimer();
    await app.close();
    vi.useRealTimers();
  });
});
