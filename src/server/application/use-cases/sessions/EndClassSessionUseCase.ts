import type { INotificationSender } from '@server/application/contracts/INotificationSender';
import type { ClassSession } from '@server/domain/entities/ClassSession';
import type { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import type { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import type {
  EndSessionRequestDTO,
  EndSessionResponseDTO,
  MovementDTO,
} from '@shared/dtos';

export class SessionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionNotFoundError';
  }
}

export class EndClassSessionUseCase {
  private readonly sessionRepo: IClassSessionRepository;
  private readonly movementRepo?: IMovementRecordRepository;
  private readonly notificationSender?: INotificationSender;
  private readonly clock: () => Date;

  constructor(
    sessionRepo: IClassSessionRepository,
    options: {
      clock?: () => Date;
      movementRepo?: IMovementRecordRepository;
      notificationSender?: INotificationSender;
    } = {},
  ) {
    this.sessionRepo = sessionRepo;
    this.movementRepo = options.movementRepo;
    this.notificationSender = options.notificationSender;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: EndSessionRequestDTO = {},
  ): Promise<EndSessionResponseDTO> {
    let session: ClassSession | null = null;

    if (input.sessionId) {
      session = await this.sessionRepo.findById(input.sessionId);
      if (session && !session.isActive()) {
        throw new SessionNotFoundError(
          'A sessão de aula informada já se encontra encerrada.',
        );
      }
    } else {
      const roomId = (input.roomId ?? 'SALA-01').trim() || 'SALA-01';
      session = await this.sessionRepo.findActiveByRoomId(roomId);
    }

    if (!session) {
      throw new SessionNotFoundError(
        'Nenhuma sessão de aula ativa foi encontrada para encerramento.',
      );
    }

    const now = this.clock();
    session.end(now);
    await this.sessionRepo.update(session);

    const elapsedMinutes = session.getElapsedMinutes(now);
    const allMovements = this.movementRepo
      ? await this.movementRepo.findBySessionId(session.id)
      : [];

    const inTransitMovements: MovementDTO[] = [];
    if (this.movementRepo) {
      for (const mov of allMovements) {
        if (mov.isActive()) {
          mov.markInTransitUnresolved();
          await this.movementRepo.update(mov);
          const movDto = mov.toDTO(now);
          inTransitMovements.push(movDto);
          if (this.notificationSender) {
            await this.notificationSender.notifyMovementInTransitUnresolved(
              movDto,
            );
          }
        }
      }
    }

    return {
      session: session.toDTO(),
      metrics: {
        totalExits: allMovements.length,
        inTransitUnresolvedCount: inTransitMovements.length,
        elapsedMinutes,
      },
      inTransitMovements,
    };
  }
}

export { EndClassSessionUseCase as EndSessionUseCase };
