import type {
  ClassSessionDTO,
  EndSessionResponseDTO,
  MovementDTO,
  WaitingQueueDTO,
} from '@shared/dtos';

export interface INotificationSender {
  notifyMovementExit(movement: MovementDTO): Promise<void>;
  notifyMovementStarted?(movement: MovementDTO): Promise<void>;
  notifyMovementReturn(movement: MovementDTO): Promise<void>;
  notifyMovementReturned?(movement: MovementDTO): Promise<void>;
  notifyQueueUpdated(
    sessionId: string,
    queue: WaitingQueueDTO[],
  ): Promise<void>;
  notifyQueueSlotCalled(
    sessionId: string,
    entry: WaitingQueueDTO,
  ): Promise<void>;
  notifyMovementOverdue(movement: MovementDTO): Promise<void>;
  notifyMovementEscalated(movement: MovementDTO): Promise<void>;
  notifyMovementInTransitUnresolved(movement: MovementDTO): Promise<void>;
  notifyMovementResolved(movement: MovementDTO): Promise<void>;
  notifySessionStarted?(session: ClassSessionDTO): Promise<void> | void;
  notifySessionEnded?(
    session: ClassSessionDTO,
    summary?: EndSessionResponseDTO,
  ): Promise<void> | void;
}
