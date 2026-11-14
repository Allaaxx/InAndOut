import { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import { INotificationSender } from '@server/application/contracts/INotificationSender';
import { AlertLevel, MovementStatus } from '@shared/enums';
import {
  CheckOverdueRequestDTO,
  CheckOverdueResponseDTO,
  MovementDTO,
} from '@shared/dtos';

export class EvaluateOverdueMovementsUseCase {
  private readonly movementRepo: IMovementRecordRepository;
  private readonly notificationSender: INotificationSender;
  private readonly sessionRepo?: IClassSessionRepository;
  private readonly clock: () => Date;

  constructor(
    movementRepo: IMovementRecordRepository,
    notificationSender: INotificationSender,
    options: {
      sessionRepo?: IClassSessionRepository;
      clock?: () => Date;
    } = {}
  ) {
    this.movementRepo = movementRepo;
    this.notificationSender = notificationSender;
    this.sessionRepo = options.sessionRepo;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: CheckOverdueRequestDTO = {}
  ): Promise<CheckOverdueResponseDTO> {
    const now = input.now ? new Date(input.now) : this.clock();

    let targetSessionId = input.sessionId?.trim();
    if (!targetSessionId && input.roomId && this.sessionRepo) {
      const activeSession = await this.sessionRepo.findActiveByRoomId(
        input.roomId.trim()
      );
      targetSessionId = activeSession?.id;
    }

    const activeMovements = targetSessionId
      ? await this.movementRepo.findActiveBySessionId(targetSessionId)
      : await this.movementRepo.findAllActive();

    const alerts: MovementDTO[] = [];
    const overdueMovements: MovementDTO[] = [];
    const autoEscalatedMovements: MovementDTO[] = [];

    for (const movement of activeMovements) {
      if (movement.status === MovementStatus.IN_TRANSIT) {
        if (movement.isOverdueThresholdReached(now)) {
          movement.markOverdue(now);
          await this.movementRepo.update(movement);
          const dto = movement.toDTO(now);
          await this.notificationSender.notifyMovementOverdue(dto);
          alerts.push(dto);
          overdueMovements.push(dto);
          continue;
        }

        const alertLevel = movement.getAlertLevel(now);
        if (alertLevel === AlertLevel.YELLOW || alertLevel === AlertLevel.RED) {
          alerts.push(movement.toDTO(now));
        }
        continue;
      }

      if (movement.status === MovementStatus.OVERDUE) {
        if (movement.isGraceWindowExpired(now)) {
          movement.escalate(now, 'AUTOMATIC');
          await this.movementRepo.update(movement);
          const dto = movement.toDTO(now);
          await this.notificationSender.notifyMovementEscalated(dto);
          alerts.push(dto);
          autoEscalatedMovements.push(dto);
          continue;
        }

        const dto = movement.toDTO(now);
        alerts.push(dto);
        overdueMovements.push(dto);
        continue;
      }

      if (movement.status === MovementStatus.ESCALATED_TO_COORDINATION) {
        const dto = movement.toDTO(now);
        alerts.push(dto);
        if (movement.escalationType === 'AUTOMATIC') {
          autoEscalatedMovements.push(dto);
        }
      }
    }

    return {
      alerts,
      overdueMovements,
      autoEscalatedMovements,
    };
  }
}

export { EvaluateOverdueMovementsUseCase as CheckOverdueMovementsUseCase };
