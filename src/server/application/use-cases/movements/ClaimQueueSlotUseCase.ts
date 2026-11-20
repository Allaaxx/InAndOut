import type { INotificationSender } from '@server/application/contracts/INotificationSender';
import type { ClassSession } from '@server/domain/entities/ClassSession';
import { MovementRecord } from '@server/domain/entities/MovementRecord';
import type { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import type { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import type { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import type { IWaitingQueueRepository } from '@server/domain/repositories/IWaitingQueueRepository';
import { StudentRA } from '@server/domain/value-objects/StudentRA';
import type { ClaimQueueRequestDTO, ClaimQueueResponseDTO } from '@shared/dtos';
import { MovementStatus, QueueEntryStatus } from '@shared/enums';
import { resolveRoomCode } from '@shared/roomCode';
import {
  QueueConflictError,
  QueueWindowExpiredError,
} from './EnqueueStudentUseCase';
import {
  MovementNotFoundError,
  MovementValidationError,
} from './RequestStudentExitUseCase';

export class ClaimQueueSlotUseCase {
  private readonly sessionRepo: IClassSessionRepository;
  private readonly studentRepo: IStudentRepository;
  private readonly movementRepo: IMovementRecordRepository;
  private readonly queueRepo: IWaitingQueueRepository;
  private readonly notificationSender: INotificationSender;
  private readonly clock: () => Date;

  constructor(
    sessionRepo: IClassSessionRepository,
    studentRepo: IStudentRepository,
    movementRepo: IMovementRecordRepository,
    queueRepo: IWaitingQueueRepository,
    notificationSender: INotificationSender,
    options: { clock?: () => Date } = {},
  ) {
    this.sessionRepo = sessionRepo;
    this.studentRepo = studentRepo;
    this.movementRepo = movementRepo;
    this.queueRepo = queueRepo;
    this.notificationSender = notificationSender;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: ClaimQueueRequestDTO,
  ): Promise<ClaimQueueResponseDTO> {
    let raObj: StudentRA;
    try {
      const candidateRa =
        input.ra ??
        (input as unknown as { studentRa?: string }).studentRa ??
        '';
      raObj = StudentRA.create(candidateRa);
    } catch (err) {
      throw new MovementValidationError(
        err instanceof Error ? err.message : 'RA inválido.',
      );
    }

    let session: ClassSession | null = null;
    if (input.sessionId) {
      session = await this.sessionRepo.findById(input.sessionId);
      if (session && !session.isActive()) {
        session = null;
      }
    } else {
      const roomId = resolveRoomCode(input.roomId);
      session = await this.sessionRepo.findActiveByRoomId(roomId);
    }

    if (!session) {
      throw new MovementNotFoundError(
        'Nenhuma sessão de aula ativa foi encontrada para confirmar a saída.',
      );
    }

    const student = await this.studentRepo.findByRa(raObj.value);
    if (!student) {
      throw new MovementNotFoundError(
        `Aluno com RA ${raObj.value} não encontrado.`,
      );
    }

    const activeMovements = await this.movementRepo.findActiveBySessionId(
      session.id,
    );
    if (activeMovements.length > 0) {
      const currentOut = activeMovements[0];
      throw new QueueConflictError(
        `Sala ocupada: ${currentOut.studentPublicName} ainda está fora da sala.`,
      );
    }

    const now = this.clock();
    const activeQueue = await this.queueRepo.findActiveBySessionId(session.id);

    // Check if any CALLED entries have expired their 2-minute confirmation window
    let callerExpired = false;
    let anyExpired = false;
    for (const item of activeQueue) {
      if (item.isExpired(now)) {
        item.expire();
        await this.queueRepo.update(item);
        anyExpired = true;
        if (item.studentRa === student.ra) {
          callerExpired = true;
        }
      }
    }

    const refreshedQueue = await this.queueRepo.findActiveBySessionId(
      session.id,
    );

    // If an entry expired and there is a next WAITING entry, promote the next student in FIFO order
    if (anyExpired && refreshedQueue.length > 0) {
      const nextHead = refreshedQueue[0];
      if (nextHead.status === QueueEntryStatus.WAITING) {
        nextHead.callSlot(now, 2);
        await this.queueRepo.update(nextHead);
        await this.notificationSender.notifyQueueSlotCalled(
          session.id,
          nextHead.toDTO(),
        );
      }
      await this.notificationSender.notifyQueueUpdated(
        session.id,
        refreshedQueue.map((q) => q.toDTO()),
      );
    } else if (anyExpired) {
      await this.notificationSender.notifyQueueUpdated(session.id, []);
    }

    if (callerExpired) {
      const nextStudentMsg =
        refreshedQueue.length > 0
          ? ` A vaga foi transferida para o próximo da fila (${refreshedQueue[0].studentPublicName}).`
          : '';
      throw new QueueWindowExpiredError(
        `A janela de confirmação de 2 minutos para ${student.publicName} expirou.${nextStudentMsg}`,
      );
    }

    if (refreshedQueue.length === 0) {
      // Check if the caller previously had an expired entry in this session
      const allSessionEntries = await this.queueRepo.findBySessionId(
        session.id,
      );
      const hadExpired = allSessionEntries.some(
        (e) =>
          e.studentRa === student.ra && e.status === QueueEntryStatus.EXPIRED,
      );
      if (hadExpired) {
        throw new QueueWindowExpiredError(
          `A janela de confirmação de 2 minutos para ${student.publicName} expirou.`,
        );
      }
      throw new MovementNotFoundError(
        `Aluno com RA ${student.ra} não está na fila de espera.`,
      );
    }

    const head = refreshedQueue[0];
    if (head.studentRa !== student.ra) {
      // Check if the caller previously had an expired entry in this session
      const allSessionEntries = await this.queueRepo.findBySessionId(
        session.id,
      );
      const hadExpired = allSessionEntries.some(
        (e) =>
          e.studentRa === student.ra && e.status === QueueEntryStatus.EXPIRED,
      );
      if (hadExpired) {
        throw new QueueWindowExpiredError(
          `A janela de confirmação de 2 minutos para ${student.publicName} expirou. A vaga foi transferida para o próximo da fila (${head.studentPublicName}).`,
        );
      }

      const inQueue = refreshedQueue.some((e) => e.studentRa === student.ra);
      if (!inQueue) {
        throw new MovementNotFoundError(
          `Aluno com RA ${student.ra} não está na fila de espera.`,
        );
      }

      throw new QueueConflictError(
        `A vaga está reservada para o primeiro da fila (${head.studentPublicName}). Aguarde sua vez.`,
      );
    }

    // Caller is at the head of the queue and within the confirmation window
    head.claim(now);
    await this.queueRepo.update(head);

    const allowedLimitMinutes =
      student.specialTimeLimitMinutes ?? session.defaultTimeLimitMinutes;

    const movement = MovementRecord.create({
      sessionId: session.id,
      studentId: student.id,
      studentRa: student.ra,
      studentFullName: student.fullName,
      studentPublicName: student.publicName,
      classCode: session.classCode,
      subject: session.subject,
      roomId: session.roomId,
      teacherName: session.teacherName,
      status: MovementStatus.IN_TRANSIT,
      startedAt: now,
      allowedLimitMinutes,
      isEmergency: false,
      isGuest: false,
    });

    await this.movementRepo.save(movement);

    const finalQueue = await this.queueRepo.findActiveBySessionId(session.id);
    const finalQueueDTOs = finalQueue.map((q) => q.toDTO());
    const movementDTO = movement.toDTO(now);

    await this.notificationSender.notifyMovementExit(movementDTO);
    await this.notificationSender.notifyQueueUpdated(
      session.id,
      finalQueueDTOs,
    );

    return {
      movement: movementDTO,
      queue: finalQueueDTOs,
    };
  }
}
