import { SOCKET_EVENTS, SOCKET_ROOMS } from '@shared/events';
import type { Socket, Server as SocketIOServer } from 'socket.io';

interface SessionPayload {
  sessionId?: string;
}

interface RoomPayload {
  room?: string;
}

type AckCallback = (response?: Record<string, unknown>) => void;

function extractSessionId(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload.trim();
  }
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'sessionId' in payload
  ) {
    const rawId = (payload as SessionPayload).sessionId;
    if (typeof rawId === 'string' && rawId.trim().length > 0) {
      return rawId.trim();
    }
  }
  return null;
}

function extractRoom(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload.trim();
  }
  if (typeof payload === 'object' && payload !== null && 'room' in payload) {
    const rawRoom = (payload as RoomPayload).room;
    if (typeof rawRoom === 'string' && rawRoom.trim().length > 0) {
      return rawRoom.trim();
    }
  }
  return null;
}

export function registerSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    // Join session room
    const handleJoinSession = (payload: unknown, ack?: AckCallback) => {
      const sessionId = extractSessionId(payload);
      if (sessionId) {
        const roomName = SOCKET_ROOMS.sessionRoom(sessionId);
        socket.join(roomName);
        if (typeof ack === 'function') {
          ack({ ok: true, room: roomName });
        }
      } else if (typeof ack === 'function') {
        ack({ ok: false, error: 'Invalid sessionId' });
      }
    };

    socket.on(SOCKET_EVENTS.JOIN_SESSION, handleJoinSession);
    socket.on('join-session', handleJoinSession);

    // Leave session room
    const handleLeaveSession = (payload: unknown, ack?: AckCallback) => {
      const sessionId = extractSessionId(payload);
      if (sessionId) {
        const roomName = SOCKET_ROOMS.sessionRoom(sessionId);
        socket.leave(roomName);
        if (typeof ack === 'function') {
          ack({ ok: true, room: roomName });
        }
      } else if (typeof ack === 'function') {
        ack({ ok: false, error: 'Invalid sessionId' });
      }
    };

    socket.on(SOCKET_EVENTS.LEAVE_SESSION, handleLeaveSession);
    socket.on('leave-session', handleLeaveSession);

    // Join coordination rooms
    const handleJoinCoordination = (_payload?: unknown, ack?: AckCallback) => {
      socket.join(SOCKET_ROOMS.COORDINATION);
      socket.join(SOCKET_ROOMS.COORDINATION_ROOM);
      if (typeof ack === 'function') {
        ack({
          ok: true,
          rooms: [SOCKET_ROOMS.COORDINATION, SOCKET_ROOMS.COORDINATION_ROOM],
        });
      }
    };

    socket.on(SOCKET_EVENTS.JOIN_COORDINATION, handleJoinCoordination);
    socket.on('join-coordination', handleJoinCoordination);

    // Leave coordination rooms
    const handleLeaveCoordination = (_payload?: unknown, ack?: AckCallback) => {
      socket.leave(SOCKET_ROOMS.COORDINATION);
      socket.leave(SOCKET_ROOMS.COORDINATION_ROOM);
      if (typeof ack === 'function') {
        ack({
          ok: true,
          rooms: [SOCKET_ROOMS.COORDINATION, SOCKET_ROOMS.COORDINATION_ROOM],
        });
      }
    };

    socket.on(SOCKET_EVENTS.LEAVE_COORDINATION, handleLeaveCoordination);
    socket.on('leave-coordination', handleLeaveCoordination);

    // Join generic / specific room
    const handleJoinRoom = (payload: unknown, ack?: AckCallback) => {
      const room = extractRoom(payload);
      if (room) {
        if (
          room === SOCKET_ROOMS.COORDINATION ||
          room === SOCKET_ROOMS.COORDINATION_ROOM
        ) {
          socket.join(SOCKET_ROOMS.COORDINATION);
          socket.join(SOCKET_ROOMS.COORDINATION_ROOM);
        } else {
          socket.join(room);
        }
        if (typeof ack === 'function') {
          ack({ ok: true, room });
        }
      } else if (typeof ack === 'function') {
        ack({ ok: false, error: 'Invalid room name' });
      }
    };

    socket.on(SOCKET_EVENTS.JOIN_ROOM, handleJoinRoom);

    // Leave generic / specific room
    const handleLeaveRoom = (payload: unknown, ack?: AckCallback) => {
      const room = extractRoom(payload);
      if (room) {
        if (
          room === SOCKET_ROOMS.COORDINATION ||
          room === SOCKET_ROOMS.COORDINATION_ROOM
        ) {
          socket.leave(SOCKET_ROOMS.COORDINATION);
          socket.leave(SOCKET_ROOMS.COORDINATION_ROOM);
        } else {
          socket.leave(room);
        }
        if (typeof ack === 'function') {
          ack({ ok: true, room });
        }
      } else if (typeof ack === 'function') {
        ack({ ok: false, error: 'Invalid room name' });
      }
    };

    socket.on(SOCKET_EVENTS.LEAVE_ROOM, handleLeaveRoom);
  });
}
