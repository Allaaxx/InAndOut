import { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import { INotificationSender } from '@server/application/contracts/INotificationSender';
import {
  MovementNotFoundError,
  MovementValidationError,
} from './RequestStudentExitUseCase';
import { EscalateMovementRequestDTO, MovementDTO } from '@shared/dtos';

export interface EscalateMovementInput extends EscalateMovementRequestDTO {
  movementId: string;
}

export interface EscalateMovementOutput {
  movement: MovementDTO;
}

export class EscalateMovementUseCase {
  private readonly movementRepo: IMovementRecordRepository;
  private readonly notificationSender: INotificationSender;
  private readonly clock: () => Date;

  constructor(
    movementRepo: IMovementRecordRepository,
    notificationSender: INotificationSender,
    options: { clock?: () => Date } = {}
  ) {
    this.movementRepo = movementRepo;
    this.notificationSender = notificationSender;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: EscalateMovementInput
  ): Promise<EscalateMovementOutput> {
    const movementId = (input.movementId ?? '').trim();
    if (!movementId) {
      throw new MovementValidationError(
        'O identificador da saída (movementId) é obrigatório.'
      );
    }

    const movement = await this.movementRepo.findById(movementId);
    if (!movement) {
      throw new MovementNotFoundError(
        `Registro de saída (${movementId}) não encontrado.`
      );
    }

    if (!movement.isActive()) {
      throw new MovementValidationError(
        'Não é possível escalar uma saída que já foi encerrada.'
      );
    }

    const now = this.clock();
    movement.escalate(now, 'MANUAL', input.notes?.trim() || undefined);
    await this.movementRepo.update(movement);

    const dto = movement.toDTO(now);
    await this.notificationSender.notifyMovementEscalated(dto);

    return {
      movement: dto,
    };
  }
}
