import { normalizeRoomCode } from './roomCode';

export const SOCKET_EVENTS = {
  MOVEMENT_EXIT: 'movement:exit',
  MOVEMENT_STARTED: 'movement:started',
  MOVEMENT_RETURN: 'movement:return',
  MOVEMENT_RETURNED: 'movement:returned',
  QUEUE_UPDATED: 'queue:updated',
  QUEUE_SLOT_CALLED: 'queue:slot-called',
  MOVEMENT_OVERDUE: 'movement:overdue',
  MOVEMENT_ESCALATED: 'movement:escalated',
  MOVEMENT_IN_TRANSIT_UNRESOLVED: 'movement:in-transit-unresolved',
  MOVEMENT_RESOLVED: 'movement:resolved',
  SESSION_STARTED: 'session:started',
  SESSION_ENDED: 'session:ended',

  // Client events
  JOIN_SESSION: 'join_session',
  LEAVE_SESSION: 'leave_session',
  JOIN_COORDINATION: 'join_coordination',
  LEAVE_COORDINATION: 'leave_coordination',
  JOIN_ROOM: 'join:room',
  LEAVE_ROOM: 'leave:room',
} as const;

export const SOCKET_ROOMS = {
  COORDINATION: 'coordenacao',
  COORDINATION_ROOM: 'room:coordenacao',
  sessionRoom: (sessionId: string) => `room:session:${sessionId}`,
  room: (roomCode: string) => `room:${normalizeRoomCode(roomCode)}`,
} as const;
