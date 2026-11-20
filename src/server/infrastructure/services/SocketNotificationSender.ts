import type { INotificationSender } from '@server/application/contracts/INotificationSender';
import type {
  ClassSessionDTO,
  EndSessionResponseDTO,
  MovementDTO,
  WaitingQueueDTO,
} from '@shared/dtos';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '@shared/events';
import type { Server as SocketIOServer } from 'socket.io';

export class SocketNotificationSender implements INotificationSender {
  private io: SocketIOServer | null;

  constructor(io: SocketIOServer | null = null) {
    this.io = io;
  }

  public setServer(io: SocketIOServer): void {
    this.io = io;
  }

  public async notifyMovementExit(movement: MovementDTO): Promise<void> {
    if (!this.io) return;
    this.io
      .to(SOCKET_ROOMS.sessionRoom(movement.sessionId))
      .to(SOCKET_ROOMS.COORDINATION)
      .to(SOCKET_ROOMS.COORDINATION_ROOM)
      .emit(SOCKET_EVENTS.MOVEMENT_EXIT, movement);
    this.io
      .to(SOCKET_ROOMS.sessionRoom(movement.sessionId))
      .to(SOCKET_ROOMS.COORDINATION)
      .to(SOCKET_ROOMS.COORDINATION_ROOM)
      .emit(SOCKET_EVENTS.MOVEMENT_STARTED, movement);
  }

  public async notifyMovementStarted(movement: MovementDTO): Promise<void> {
    await this.notifyMovementExit(movement);
  }

  public async notifyMovementReturn(movement: MovementDTO): Promise<void> {
    if (!this.io) return;
    this.io
      .to(SOCKET_ROOMS.sessionRoom(movement.sessionId))
      .to(SOCKET_ROOMS.COORDINATION)
      .to(SOCKET_ROOMS.COORDINATION_ROOM)
      .emit(SOCKET_EVENTS.MOVEMENT_RETURN, movement);
    this.io
      .to(SOCKET_ROOMS.sessionRoom(movement.sessionId))
      .to(SOCKET_ROOMS.COORDINATION)
      .to(SOCKET_ROOMS.COORDINATION_ROOM)
      .emit(SOCKET_EVENTS.MOVEMENT_RETURNED, movement);
  }

  public async notifyMovementReturned(movement: MovementDTO): Promise<void> {
    await this.notifyMovementReturn(movement);
  }

  public async notifyQueueUpdated(
    sessionId: string,
    queue: WaitingQueueDTO[],
  ): Promise<void> {
    if (!this.io) return;
    this.io
      .to(SOCKET_ROOMS.sessionRoom(sessionId))
      .emit(SOCKET_EVENTS.QUEUE_UPDATED, { sessionId, queue });
  }

  public async notifyQueueSlotCalled(
    sessionId: string,
    entry: WaitingQueueDTO,
  ): Promise<void> {
    if (!this.io) return;
    this.io
      .to(SOCKET_ROOMS.sessionRoom(sessionId))
      .emit(SOCKET_EVENTS.QUEUE_SLOT_CALLED, {
        sessionId,
        entry,
        expiresAt: entry.expiresAt ?? '',
      });
  }

  public async notifyMovementOverdue(movement: MovementDTO): Promise<void> {
    if (!this.io) return;
    this.io
      .to(SOCKET_ROOMS.sessionRoom(movement.sessionId))
      .to(SOCKET_ROOMS.COORDINATION)
      .to(SOCKET_ROOMS.COORDINATION_ROOM)
      .emit(SOCKET_EVENTS.MOVEMENT_OVERDUE, movement);
  }

  public async notifyMovementEscalated(movement: MovementDTO): Promise<void> {
    if (!this.io) return;
    this.io
      .to(SOCKET_ROOMS.sessionRoom(movement.sessionId))
      .to(SOCKET_ROOMS.COORDINATION)
      .to(SOCKET_ROOMS.COORDINATION_ROOM)
      .emit(SOCKET_EVENTS.MOVEMENT_ESCALATED, movement);
  }

  public async notifyMovementInTransitUnresolved(
    movement: MovementDTO,
  ): Promise<void> {
    if (!this.io) return;
    this.io
      .to(SOCKET_ROOMS.COORDINATION)
      .to(SOCKET_ROOMS.COORDINATION_ROOM)
      .emit(SOCKET_EVENTS.MOVEMENT_IN_TRANSIT_UNRESOLVED, movement);
  }

  public async notifyMovementResolved(movement: MovementDTO): Promise<void> {
    if (!this.io) return;
    this.io
      .to(SOCKET_ROOMS.sessionRoom(movement.sessionId))
      .to(SOCKET_ROOMS.COORDINATION)
      .to(SOCKET_ROOMS.COORDINATION_ROOM)
      .emit(SOCKET_EVENTS.MOVEMENT_RESOLVED, movement);
  }

  public async notifySessionStarted(session: ClassSessionDTO): Promise<void> {
    if (!this.io) return;
    this.io
      .to(SOCKET_ROOMS.room(session.roomId))
      .to(SOCKET_ROOMS.COORDINATION)
      .to(SOCKET_ROOMS.COORDINATION_ROOM)
      .emit(SOCKET_EVENTS.SESSION_STARTED, { session });
  }

  public async notifySessionEnded(
    session: ClassSessionDTO,
    summary?: EndSessionResponseDTO,
  ): Promise<void> {
    if (!this.io) return;
    this.io
      .to(SOCKET_ROOMS.room(session.roomId))
      .to(SOCKET_ROOMS.COORDINATION)
      .to(SOCKET_ROOMS.COORDINATION_ROOM)
      .emit(
        SOCKET_EVENTS.SESSION_ENDED,
        summary ?? {
          session,
          metrics: {
            totalExits: 0,
            inTransitUnresolvedCount: 0,
            elapsedMinutes: 0,
          },
          inTransitMovements: [],
        },
      );
  }
}
