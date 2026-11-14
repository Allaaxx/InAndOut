import { ClassSession } from '@server/domain/entities/ClassSession';
import { WaitingQueueEntry } from '@server/domain/entities/WaitingQueueEntry';
import { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import { IWaitingQueueRepository } from '@server/domain/repositories/IWaitingQueueRepository';
import { StudentRA } from '@server/domain/value-objects/StudentRA';
import { INotificationSender } from '@server/application/contracts/INotificationSender';
import {
  MovementNotFoundError,
  MovementValidationError,
  StudentNotInClassError,
} from './RequestStudentExitUseCase';
import { QueueEntryStatus } from '@shared/enums';
import {
  EnqueueWaitingRequestDTO,
  EnqueueWaitingResponseDTO,
} from '@shared/dtos';

export class QueueConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueueConflictError';
  }
}

export class QueueWindowExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueueWindowExpiredError';
  }
}

export class EnqueueStudentUseCase {
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
    options: { clock?: () => Date } = {}
  ) {
    this.sessionRepo = sessionRepo;
    this.studentRepo = studentRepo;
    this.movementRepo = movementRepo;
    this.queueRepo = queueRepo;
    this.notificationSender = notificationSender;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: EnqueueWaitingRequestDTO
  ): Promise<EnqueueWaitingResponseDTO> {
    let raObj: StudentRA;
    try {
      raObj = StudentRA.create(input.ra ?? '');
    } catch (err) {
      throw new MovementValidationError(
        err instanceof Error ? err.message : 'RA inválido.'
      );
    }

    let session: ClassSession | null = null;
    if (input.sessionId) {
      session = await this.sessionRepo.findById(input.sessionId);
      if (session && !session.isActive()) {
        session = null;
      }
    } else {
      const roomId = (input.roomId ?? 'SALA-01').trim() || 'SALA-01';
      session = await this.sessionRepo.findActiveByRoomId(roomId);
    }

    if (!session) {
      throw new MovementNotFoundError(
        'Nenhuma sessão de aula ativa foi encontrada para entrar na fila de espera.'
      );
    }

    const student = await this.studentRepo.findByRa(raObj.value);
    if (!student) {
      throw new MovementNotFoundError(
        `Aluno com RA ${raObj.value} não encontrado.`
      );
    }

    if (student.classCode !== session.classCode) {
      throw new StudentNotInClassError(
        `O aluno (${student.publicName}) pertence à turma ${student.classCode} e não está matriculado na turma ativa (${session.classCode}).`
      );
    }

    const activeMovement = await this.movementRepo.findActiveByStudentRa(
      student.ra,
      session.id
    );
    if (activeMovement) {
      throw new QueueConflictError(
        `O estudante ${student.publicName} (RA ${student.ra}) já está fora da sala no momento.`
      );
    }

    const now = this.clock();

    // Expire any stale CALLED entries before checking active queue
    const currentActiveQueue = await this.queueRepo.findActiveBySessionId(
      session.id
    );
    for (const item of currentActiveQueue) {
      if (item.isExpired(now)) {
        item.expire();
        await this.queueRepo.update(item);
      }
    }

    const existingQueueEntry = await this.queueRepo.findActiveByStudentRa(
      student.ra,
      session.id
    );
    if (existingQueueEntry) {
      throw new QueueConflictError(
        `O estudante ${student.publicName} (RA ${student.ra}) já está na fila de espera na posição ${existingQueueEntry.position}.`
      );
    }

    const refreshedQueue = await this.queueRepo.findActiveBySessionId(
      session.id
    );
    const nextPosition = refreshedQueue.length + 1;

    const entry = WaitingQueueEntry.create({
      sessionId: session.id,
      studentRa: student.ra,
      studentFullName: student.fullName,
      studentPublicName: student.publicName,
      position: nextPosition,
      status: QueueEntryStatus.WAITING,
      requestedAt: now,
    });

    await this.queueRepo.save(entry);

    const updatedQueue = await this.queueRepo.findActiveBySessionId(session.id);
    const queueDTOs = updatedQueue.map((q) => q.toDTO());

    await this.notificationSender.notifyQueueUpdated(session.id, queueDTOs);

    return {
      entry: entry.toDTO(),
      queue: queueDTOs,
    };
  }
}
