import { describe, it, expect, vi } from 'vitest';
import { InMemoryClassSessionRepository } from '@server/infrastructure/repositories/InMemoryClassSessionRepository';
import { InMemoryStudentRepository } from '@server/infrastructure/repositories/InMemoryStudentRepository';
import { InMemoryMovementRecordRepository } from '@server/infrastructure/repositories/InMemoryMovementRecordRepository';
import { SocketNotificationSender } from '@server/infrastructure/services/SocketNotificationSender';
import { StartClassSessionUseCase } from '@server/application/use-cases/sessions/StartClassSessionUseCase';
import {
  RequestStudentExitUseCase,
  StudentNotInClassError,
} from '@server/application/use-cases/movements/RequestStudentExitUseCase';
import {
  AuthorizeEmergencyExitUseCase,
  AuthorizeGuestExitUseCase,
  MovementAuthorizationError,
} from '@server/application/use-cases/movements/EmergencyAndGuestExitUseCases';
import { MovementStatus } from '@shared/enums';

describe('Domain & Use-Case Seam: Teacher Emergency Exit & Guest Student Authorization', () => {
  function setupUseCases(now = new Date('2026-03-10T09:00:00.000Z')) {
    const sessionRepo = new InMemoryClassSessionRepository();
    const studentRepo = new InMemoryStudentRepository();
    const movementRepo = new InMemoryMovementRecordRepository();
    const notificationSender = new SocketNotificationSender();

    const startSession = new StartClassSessionUseCase(sessionRepo, {
      clock: () => now,
    });
    const requestExit = new RequestStudentExitUseCase(
      sessionRepo,
      studentRepo,
      movementRepo,
      notificationSender,
      { clock: () => now }
    );
    const authorizeEmergencyExit = new AuthorizeEmergencyExitUseCase(
      sessionRepo,
      studentRepo,
      movementRepo,
      notificationSender,
      { clock: () => now }
    );
    const authorizeGuestExit = new AuthorizeGuestExitUseCase(
      sessionRepo,
      studentRepo,
      movementRepo,
      notificationSender,
      { clock: () => now }
    );

    return {
      sessionRepo,
      studentRepo,
      movementRepo,
      notificationSender,
      startSession,
      requestExit,
      authorizeEmergencyExit,
      authorizeGuestExit,
    };
  }

  it('authorizes concurrent emergency exit even when another student is already outside and records teacher audit ID', async () => {
    const now = new Date('2026-03-10T09:10:00.000Z');
    const {
      startSession,
      requestExit,
      authorizeEmergencyExit,
      movementRepo,
      notificationSender,
    } = setupUseCases(now);
    const notifySpy = vi.spyOn(notificationSender, 'notifyMovementExit');

    const { session } = await startSession.execute({
      classCode: '1A',
      subject: 'Matemática',
      roomId: 'SALA-01',
      teacherId: 'teacher-1',
      teacherName: 'Prof. Carlos Eduardo',
    });

    // First student (Lucas Silva - 1001) exits normally
    const first = await requestExit.execute({
      ra: '1001',
      sessionId: session.id,
    });
    expect(first.movement.status).toBe(MovementStatus.IN_TRANSIT);
    expect(first.movement.isEmergency).toBe(false);

    // Second student (João Mendes - 1002) exits via teacher emergency override while Lucas is still outside
    const second = await authorizeEmergencyExit.execute({
      ra: '1002',
      sessionId: session.id,
      authorizedByTeacherId: 'teacher-1',
      reason: 'Mal-estar súbito',
    });

    expect(second.movement).toMatchObject({
      sessionId: session.id,
      studentRa: '1002',
      studentPublicName: 'João M.',
      status: MovementStatus.IN_TRANSIT,
      isEmergency: true,
      isGuest: false,
      authorizedByTeacherId: 'teacher-1',
    });

    const activeInSession = await movementRepo.findActiveBySessionId(session.id);
    expect(activeInSession).toHaveLength(2);
    expect(notifySpy).toHaveBeenCalledTimes(2);
  });

  it('authorizes guest exit for a student from another class or a newly transferred unindexed student with teacher audit trail', async () => {
    const now = new Date('2026-03-10T09:20:00.000Z');
    const { startSession, requestExit, authorizeGuestExit } =
      setupUseCases(now);

    const { session } = await startSession.execute({
      classCode: '1A',
      subject: 'História',
      roomId: 'SALA-01',
      teacherId: 'teacher-1',
      teacherName: 'Prof. Carlos Eduardo',
    });

    // Without guest authorization, student 2001 (from class 2B) is rejected
    await expect(
      requestExit.execute({
        ra: '2001',
        sessionId: session.id,
      })
    ).rejects.toThrow(StudentNotInClassError);

    // With teacher guest authorization, student 2001 (Pedro Alves - 2B) is allowed
    const guestResult = await authorizeGuestExit.execute({
      ra: '2001',
      sessionId: session.id,
      authorizedByTeacherId: 'teacher-1',
    });

    expect(guestResult.movement).toMatchObject({
      sessionId: session.id,
      studentRa: '2001',
      studentFullName: 'Pedro Alves',
      studentPublicName: 'Pedro A.',
      classCode: '1A',
      isGuest: true,
      isEmergency: false,
      authorizedByTeacherId: 'teacher-1',
    });

    // Also supports an unindexed transfer student when fullName is provided with forceConcurrent
    const transferResult = await authorizeGuestExit.execute({
      ra: '3099',
      fullName: 'Beatriz Oliveira',
      originClassCode: '3A',
      sessionId: session.id,
      forceConcurrent: true,
      authorizedByTeacherId: 'teacher-1',
    });

    expect(transferResult.movement).toMatchObject({
      sessionId: session.id,
      studentRa: '3099',
      studentFullName: 'Beatriz Oliveira',
      studentPublicName: 'Beatriz O.',
      isGuest: true,
      isEmergency: true,
      authorizedByTeacherId: 'teacher-1',
    });
  });

  it('rejects emergency or guest overrides when teacher authorization ID is missing', async () => {
    const { startSession, authorizeEmergencyExit, authorizeGuestExit } =
      setupUseCases();

    const { session } = await startSession.execute({
      classCode: '1A',
      subject: 'Física',
      roomId: 'SALA-01',
      teacherId: 'teacher-1',
      teacherName: 'Prof. Carlos Eduardo',
    });

    await expect(
      authorizeEmergencyExit.execute({
        ra: '1001',
        sessionId: session.id,
        authorizedByTeacherId: '   ',
      })
    ).rejects.toThrow(MovementAuthorizationError);

    await expect(
      authorizeGuestExit.execute({
        ra: '2001',
        sessionId: session.id,
        authorizedByTeacherId: '',
      })
    ).rejects.toThrow(MovementAuthorizationError);
  });
});
