import type { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import type { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import type { IWaitingQueueRepository } from '@server/domain/repositories/IWaitingQueueRepository';
import type { ActiveSessionResponseDTO } from '@shared/dtos';
import { resolveRoomCode } from '@shared/roomCode';

export interface GetActiveSessionInput {
  roomId?: string;
}

export class GetActiveSessionUseCase {
  private readonly sessionRepo: IClassSessionRepository;
  private readonly movementRepo?: IMovementRecordRepository;
  private readonly queueRepo?: IWaitingQueueRepository;
  private readonly clock: () => Date;

  constructor(
    sessionRepo: IClassSessionRepository,
    options: {
      movementRepo?: IMovementRecordRepository;
      queueRepo?: IWaitingQueueRepository;
      clock?: () => Date;
    } = {},
  ) {
    this.sessionRepo = sessionRepo;
    this.movementRepo = options.movementRepo;
    this.queueRepo = options.queueRepo;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: GetActiveSessionInput = {},
  ): Promise<ActiveSessionResponseDTO> {
    const roomId = resolveRoomCode(input.roomId);
    const activeSession = await this.sessionRepo.findActiveByRoomId(roomId);

    if (!activeSession) {
      return {
        session: null,
        activeMovements: [],
        queue: [],
      };
    }

    const now = this.clock();
    const activeMovements = this.movementRepo
      ? (await this.movementRepo.findActiveBySessionId(activeSession.id)).map(
          (m) => m.toDTO(now),
        )
      : [];

    const queue = this.queueRepo
      ? (await this.queueRepo.findActiveBySessionId(activeSession.id)).map(
          (q) => q.toDTO(),
        )
      : [];

    return {
      session: activeSession.toDTO(),
      activeMovements,
      queue,
    };
  }
}
