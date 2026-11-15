import type { INotificationSender } from '@server/application/contracts/INotificationSender';
import type { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import type { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import type { IWaitingQueueRepository } from '@server/domain/repositories/IWaitingQueueRepository';
import { StudentRA } from '@server/domain/value-objects/StudentRA';
import type {
  RegisterReturnRequestDTO,
  RegisterReturnResponseDTO,
  WaitingQueueDTO,
} from '@shared/dtos';
import { QueueEntryStatus } from '@shared/enums';
import {
  MovementNotFoundError,
  MovementValidationError,
} from './RequestStudentExitUseCase';

export class RegisterStudentReturnUseCase {
  private readonly sessionRepo: IClassSessionRepository;
  private readonly movementRepo: IMovementRecordRepository;
  private readonly notificationSender: INotificationSender;
  private readonly queueRepo?: IWaitingQueueRepository;
  private readonly clock: () => Date;

  constructor(
    sessionRepo: IClassSessionRepository,
    movementRepo: IMovementRecordRepository,
    notificationSender: INotificationSender,
    options: {
      queueRepo?: IWaitingQueueRepository;
      clock?: () => Date;
    } = {},
  ) {
    this.sessionRepo = sessionRepo;
    this.movementRepo = movementRepo;
    this.notificationSender = notificationSender;
    this.queueRepo = options.queueRepo;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: RegisterReturnRequestDTO,
  ): Promise<RegisterReturnResponseDTO> {
    let raObj: StudentRA;
    try {
      raObj = StudentRA.create(input.ra ?? '');
    } catch (err) {
      throw new MovementValidationError(
        err instanceof Error ? err.message : 'RA inválido.',
      );
    }

    let targetSessionId = input.sessionId?.trim();
    if (!targetSessionId && input.roomId) {
      const roomSession = await this.sessionRepo.findActiveByRoomId(
        input.roomId.trim(),
      );
      if (roomSession) {
        targetSessionId = roomSession.id;
      }
    }

    const activeMovement = await this.movementRepo.findActiveByStudentRa(
      raObj.value,
      targetSessionId || undefined,
    );

    if (!activeMovement) {
      throw new MovementNotFoundError(
        `Nenhuma saída ativa encontrada para o RA ${raObj.value}.`,
      );
    }

    const session = await this.sessionRepo.findById(activeMovement.sessionId);
    const plannedDurationMinutes = session?.plannedDurationMinutes ?? 50;

    const now = this.clock();
    activeMovement.registerReturn(now, plannedDurationMinutes);
    await this.movementRepo.update(activeMovement);

    const dto = activeMovement.toDTO(now);
    await this.notificationSender.notifyMovementReturn(dto);

    let nextCalledQueueEntry: WaitingQueueDTO | null = null;
    if (this.queueRepo) {
      const remainingActive = await this.movementRepo.findActiveBySessionId(
        activeMovement.sessionId,
      );
      if (remainingActive.length === 0) {
        const activeQueue = await this.queueRepo.findActiveBySessionId(
          activeMovement.sessionId,
        );
        for (const entry of activeQueue) {
          if (entry.isExpired(now)) {
            entry.expire();
            await this.queueRepo.update(entry);
          }
        }
        const refreshedQueue = await this.queueRepo.findActiveBySessionId(
          activeMovement.sessionId,
        );
        if (refreshedQueue.length > 0) {
          const head = refreshedQueue[0];
          if (head.status === QueueEntryStatus.WAITING) {
            head.callSlot(now, 2);
            await this.queueRepo.update(head);
          }
          nextCalledQueueEntry = head.toDTO();
          await this.notificationSender.notifyQueueSlotCalled(
            activeMovement.sessionId,
            nextCalledQueueEntry,
          );
          await this.notificationSender.notifyQueueUpdated(
            activeMovement.sessionId,
            refreshedQueue.map((q) => q.toDTO()),
          );
        }
      }
    }

    return {
      movement: dto,
      message: 'Retorno registrado com sucesso',
      nextCalledQueueEntry,
    };
  }
}
