import { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import { INotificationSender } from '@server/application/contracts/INotificationSender';
import { MovementDTO } from '@shared/dtos';
import { IncidentOutcome } from '@shared/enums';

export class MovementNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MovementNotFoundError';
  }
}

export class InvalidOutcomeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOutcomeError';
  }
}

export interface ResolveMovementIncidentInput {
  movementId: string;
  coordinatorId: string;
  outcome: IncidentOutcome;
  notes?: string;
  plannedSessionDurationMinutes?: number;
}

export interface ResolveMovementIncidentOutput {
  movement: MovementDTO;
}

export class ResolveMovementIncidentUseCase {
  private readonly movementRepo: IMovementRecordRepository;
  private readonly notificationSender?: INotificationSender;
  private readonly clock: () => Date;

  constructor(
    movementRepo: IMovementRecordRepository,
    options: {
      notificationSender?: INotificationSender;
      clock?: () => Date;
    } = {}
  ) {
    this.movementRepo = movementRepo;
    this.notificationSender = options.notificationSender;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: ResolveMovementIncidentInput
  ): Promise<ResolveMovementIncidentOutput> {
    const movement = await this.movementRepo.findById(input.movementId);
    if (!movement) {
      throw new MovementNotFoundError(
        `Registro de saída com ID '${input.movementId}' não foi encontrado.`
      );
    }

    if (!input.outcome || !Object.values(IncidentOutcome).includes(input.outcome)) {
      throw new InvalidOutcomeError(
        'Desfecho de ocorrência inválido ou não informado.'
      );
    }

    const now = this.clock();
    movement.resolve(
      input.outcome,
      input.coordinatorId,
      now,
      input.notes,
      input.plannedSessionDurationMinutes ?? 50
    );

    await this.movementRepo.update(movement);

    const dto = movement.toDTO(now);

    if (this.notificationSender) {
      await this.notificationSender.notifyMovementResolved(dto);
    }

    return { movement: dto };
  }
}
