import { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import { ActiveSessionResponseDTO } from '@shared/dtos';

export interface GetActiveSessionInput {
  roomId?: string;
}

export class GetActiveSessionUseCase {
  private readonly sessionRepo: IClassSessionRepository;

  constructor(sessionRepo: IClassSessionRepository) {
    this.sessionRepo = sessionRepo;
  }

  public async execute(
    input: GetActiveSessionInput = {}
  ): Promise<ActiveSessionResponseDTO> {
    const roomId = (input.roomId ?? 'SALA-01').trim() || 'SALA-01';
    const activeSession = await this.sessionRepo.findActiveByRoomId(roomId);

    return {
      session: activeSession ? activeSession.toDTO() : null,
      activeMovements: [],
      queue: [],
    };
  }
}
