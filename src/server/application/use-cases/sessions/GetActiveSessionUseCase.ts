import { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import { ActiveSessionResponseDTO } from '@shared/dtos';

export interface GetActiveSessionInput {
  roomId?: string;
}

export class GetActiveSessionUseCase {
  private readonly sessionRepo: IClassSessionRepository;
  private readonly movementRepo?: IMovementRecordRepository;
  private readonly clock: () => Date;

  constructor(
    sessionRepo: IClassSessionRepository,
    options: {
      movementRepo?: IMovementRecordRepository;
      clock?: () => Date;
    } = {}
  ) {
    this.sessionRepo = sessionRepo;
    this.movementRepo = options.movementRepo;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: GetActiveSessionInput = {}
  ): Promise<ActiveSessionResponseDTO> {
    const roomId = (input.roomId ?? 'SALA-01').trim() || 'SALA-01';
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
          (m) => m.toDTO(now)
        )
      : [];

    return {
      session: activeSession.toDTO(),
      activeMovements,
      queue: [],
    };
  }
}
