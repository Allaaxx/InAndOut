import { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import { IWaitingQueueRepository } from '@server/domain/repositories/IWaitingQueueRepository';
import { StudentRA } from '@server/domain/value-objects/StudentRA';
import { INotificationSender } from '@server/application/contracts/INotificationSender';
import {
  MovementNotFoundError,
  MovementValidationError,
} from './RequestStudentExitUseCase';
import { QueueEntryStatus } from '@shared/enums';
import { CancelQueueResponseDTO } from '@shared/dtos';

export interface CancelQueueEntryInput {
  ra: string;
  sessionId?: string;
  roomId?: string;
}

export class CancelQueueEntryUseCase {
  private readonly sessionRepo: IClassSessionRepository;
  private readonly movementRepo: IMovementRecordRepository;
  private readonly queueRepo: IWaitingQueueRepository;
  private readonly notificationSender: INotificationSender;
  private readonly clock: () => Date;

  constructor(
    sessionRepo: IClassSessionRepository,
    movementRepo: IMovementRecordRepository,
    queueRepo: IWaitingQueueRepository,
    notificationSender: INotificationSender,
    options: { clock?: () => Date } = {}
  ) {
    this.sessionRepo = sessionRepo;
    this.movementRepo = movementRepo;
    this.queueRepo = queueRepo;
    this.notificationSender = notificationSender;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: CancelQueueEntryInput
  ): Promise<CancelQueueResponseDTO> {
    let raObj: StudentRA;
    try {
      raObj = StudentRA.create(input.ra ?? '');
    } catch (err) {
      throw new MovementValidationError(
        err instanceof Error ? err.message : 'RA inválido.'
      );
    }

    let targetSessionId = input.sessionId?.trim();
    if (!targetSessionId && input.roomId) {
      const roomSession = await this.sessionRepo.findActiveByRoomId(
        input.roomId.trim()
      );
      if (roomSession) {
        targetSessionId = roomSession.id;
      }
    }

    const entry = await this.queueRepo.findActiveByStudentRa(
      raObj.value,
      targetSessionId || undefined
    );

    if (!entry) {
      throw new MovementNotFoundError(
        `Nenhuma solicitação ativa na fila de espera encontrada para o RA ${raObj.value}.`
      );
    }

    const wasCalled = entry.status === QueueEntryStatus.CALLED;
    const sessionId = entry.sessionId;
    const now = this.clock();

    entry.cancel();
    await this.queueRepo.update(entry);

    // Refresh remaining active queue entries
    const remainingQueue = await this.queueRepo.findActiveBySessionId(sessionId);

    // If the cancelled entry was CALLED (or room is free) and there is a next WAITING student, promote them
    const activeMovements = await this.movementRepo.findActiveBySessionId(
      sessionId
    );
    if (
      (wasCalled || activeMovements.length === 0) &&
      remainingQueue.length > 0
    ) {
      const head = remainingQueue[0];
      if (head.status === QueueEntryStatus.WAITING) {
        head.callSlot(now, 2);
        await this.queueRepo.update(head);
        await this.notificationSender.notifyQueueSlotCalled(
          sessionId,
          head.toDTO()
        );
      }
    }

    const queueDTOs = remainingQueue.map((q) => q.toDTO());
    await this.notificationSender.notifyQueueUpdated(sessionId, queueDTOs);

    return {
      cancelled: true,
      queue: queueDTOs,
    };
  }
}
