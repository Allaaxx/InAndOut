import { ClassSession } from '@server/domain/entities/ClassSession';
import { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import {
  EndSessionRequestDTO,
  EndSessionResponseDTO,
} from '@shared/dtos';

export class SessionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionNotFoundError';
  }
}

export class EndClassSessionUseCase {
  private readonly sessionRepo: IClassSessionRepository;
  private readonly clock: () => Date;

  constructor(
    sessionRepo: IClassSessionRepository,
    options: { clock?: () => Date } = {}
  ) {
    this.sessionRepo = sessionRepo;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: EndSessionRequestDTO = {}
  ): Promise<EndSessionResponseDTO> {
    let session: ClassSession | null = null;

    if (input.sessionId) {
      session = await this.sessionRepo.findById(input.sessionId);
      if (session && !session.isActive()) {
        throw new SessionNotFoundError(
          'A sessão de aula informada já se encontra encerrada.'
        );
      }
    } else {
      const roomId = (input.roomId ?? 'SALA-01').trim() || 'SALA-01';
      session = await this.sessionRepo.findActiveByRoomId(roomId);
    }

    if (!session) {
      throw new SessionNotFoundError(
        'Nenhuma sessão de aula ativa foi encontrada para encerramento.'
      );
    }

    const now = this.clock();
    session.end(now);
    await this.sessionRepo.update(session);

    const elapsedMinutes = session.getElapsedMinutes(now);

    return {
      session: session.toDTO(),
      metrics: {
        totalExits: 0,
        inTransitUnresolvedCount: 0,
        elapsedMinutes,
      },
      inTransitMovements: [],
    };
  }
}

export { EndClassSessionUseCase as EndSessionUseCase };
