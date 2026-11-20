import type {
  EndSessionResponseDTO,
  MovementDTO,
  StartSessionResponseDTO,
  WaitingQueueDTO,
} from '@shared/dtos';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '@shared/events';
import { normalizeRoomCode } from '@shared/roomCode';
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

const SOCKET_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_API_URL) ||
  'http://localhost:3000';

interface SocketTarget {
  origin: string;
  path: string;
}

/**
 * socket.io-client treats a URL pathname as a namespace, so an API mounted
 * under a prefix (e.g. `/api` behind the web reverse proxy) must be expressed
 * as the transport `path` instead.
 */
export function resolveSocketTarget(apiUrl: string): SocketTarget {
  const fallbackOrigin = globalThis.location?.origin ?? 'http://localhost';
  const parsed = new URL(apiUrl, fallbackOrigin);
  const basePath = parsed.pathname.replace(/\/+$/, '');
  return { origin: parsed.origin, path: `${basePath}/socket.io` };
}

export interface UseSocketOptions {
  sessionId?: string | null;
  roomCode?: string | null;
  room?: string;
  isCoordination?: boolean;
  enabled?: boolean;
  url?: string;
  autoConnect?: boolean;
  onMovementExit?: (movement: MovementDTO) => void;
  onMovementStarted?: (movement: MovementDTO) => void;
  onMovementReturn?: (movement: MovementDTO) => void;
  onMovementReturned?: (movement: MovementDTO) => void;
  onQueueUpdated?: (payload: {
    sessionId: string;
    queue: WaitingQueueDTO[];
  }) => void;
  onQueueSlotCalled?: (payload: {
    sessionId: string;
    entry: WaitingQueueDTO;
    expiresAt: string;
  }) => void;
  onMovementOverdue?: (movement: MovementDTO) => void;
  onMovementEscalated?: (movement: MovementDTO) => void;
  onMovementInTransitUnresolved?: (movement: MovementDTO) => void;
  onMovementResolved?: (movement: MovementDTO) => void;
  onSessionStarted?: (payload: StartSessionResponseDTO) => void;
  onSessionEnded?: (payload: EndSessionResponseDTO) => void;
}

export function useSocket({
  sessionId,
  roomCode,
  room,
  isCoordination = false,
  enabled = true,
  url,
  autoConnect,
  onMovementExit,
  onMovementStarted,
  onMovementReturn,
  onMovementReturned,
  onQueueUpdated,
  onQueueSlotCalled,
  onMovementOverdue,
  onMovementEscalated,
  onMovementInTransitUnresolved,
  onMovementResolved,
  onSessionStarted,
  onSessionEnded,
}: UseSocketOptions) {
  const callbacksRef = useRef({
    onMovementExit,
    onMovementStarted,
    onMovementReturn,
    onMovementReturned,
    onQueueUpdated,
    onQueueSlotCalled,
    onMovementOverdue,
    onMovementEscalated,
    onMovementInTransitUnresolved,
    onMovementResolved,
    onSessionStarted,
    onSessionEnded,
  });

  useEffect(() => {
    callbacksRef.current = {
      onMovementExit,
      onMovementStarted,
      onMovementReturn,
      onMovementReturned,
      onQueueUpdated,
      onQueueSlotCalled,
      onMovementOverdue,
      onMovementEscalated,
      onMovementInTransitUnresolved,
      onMovementResolved,
      onSessionStarted,
      onSessionEnded,
    };
  }, [
    onMovementExit,
    onMovementStarted,
    onMovementReturn,
    onMovementReturned,
    onQueueUpdated,
    onQueueSlotCalled,
    onMovementOverdue,
    onMovementEscalated,
    onMovementInTransitUnresolved,
    onMovementResolved,
    onSessionStarted,
    onSessionEnded,
  ]);

  useEffect(() => {
    const normalizedRoomCode = roomCode
      ? normalizeRoomCode(roomCode) || null
      : null;

    const targetRoom =
      room ??
      (isCoordination
        ? SOCKET_ROOMS.COORDINATION
        : !normalizedRoomCode && sessionId
          ? SOCKET_ROOMS.sessionRoom(sessionId)
          : null);

    if (!enabled || (!targetRoom && !normalizedRoomCode)) {
      return;
    }

    const isTestEnv =
      typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

    const socketTarget = resolveSocketTarget(url ?? SOCKET_URL);
    const shouldAutoConnect = autoConnect ?? !isTestEnv;

    let socket: Socket | null = null;
    try {
      socket = io(socketTarget.origin, {
        path: socketTarget.path,
        autoConnect: shouldAutoConnect,
        transports: ['websocket', 'polling'],
      });
    } catch {
      return;
    }

    if (!socket) return;

    const matchesSession = (movSessionId?: string) => {
      if (isCoordination || room === SOCKET_ROOMS.COORDINATION) {
        return true;
      }
      if (!sessionId) return true;
      return movSessionId === sessionId;
    };

    const handleStarted = (movement: MovementDTO) => {
      if (!matchesSession(movement.sessionId)) return;
      callbacksRef.current.onMovementExit?.(movement);
      callbacksRef.current.onMovementStarted?.(movement);
    };

    const handleReturn = (movement: MovementDTO) => {
      if (!matchesSession(movement.sessionId)) return;
      callbacksRef.current.onMovementReturn?.(movement);
      callbacksRef.current.onMovementReturned?.(movement);
    };

    const handleQueueUpdated = (payload: {
      sessionId: string;
      queue: WaitingQueueDTO[];
    }) => {
      if (!matchesSession(payload.sessionId)) return;
      callbacksRef.current.onQueueUpdated?.(payload);
    };

    const handleQueueSlotCalled = (payload: {
      sessionId: string;
      entry: WaitingQueueDTO;
      expiresAt: string;
    }) => {
      if (!matchesSession(payload.sessionId)) return;
      callbacksRef.current.onQueueSlotCalled?.(payload);
    };

    const handleOverdue = (movement: MovementDTO) => {
      if (!matchesSession(movement.sessionId)) return;
      callbacksRef.current.onMovementOverdue?.(movement);
    };

    const handleEscalated = (movement: MovementDTO) => {
      if (!matchesSession(movement.sessionId)) return;
      callbacksRef.current.onMovementEscalated?.(movement);
    };

    const handleInTransitUnresolved = (movement: MovementDTO) => {
      if (!matchesSession(movement.sessionId)) return;
      callbacksRef.current.onMovementInTransitUnresolved?.(movement);
    };

    const handleResolved = (movement: MovementDTO) => {
      if (!matchesSession(movement.sessionId)) return;
      callbacksRef.current.onMovementResolved?.(movement);
    };

    const handleSessionStarted = (payload: StartSessionResponseDTO) => {
      callbacksRef.current.onSessionStarted?.(payload);
    };

    const handleSessionEnded = (payload: EndSessionResponseDTO) => {
      callbacksRef.current.onSessionEnded?.(payload);
    };

    const joinRooms = () => {
      if (normalizedRoomCode) {
        socket?.emit(SOCKET_EVENTS.JOIN_ROOM, { roomCode: normalizedRoomCode });
      }
      if (targetRoom) {
        socket?.emit(SOCKET_EVENTS.JOIN_ROOM, targetRoom);
      }
      if (isCoordination) {
        socket?.emit(SOCKET_EVENTS.JOIN_COORDINATION);
      } else if (sessionId) {
        socket?.emit(SOCKET_EVENTS.JOIN_SESSION, sessionId);
      }
    };

    socket.on('connect', joinRooms);
    joinRooms();

    socket.on(SOCKET_EVENTS.MOVEMENT_EXIT, handleStarted);
    socket.on(SOCKET_EVENTS.MOVEMENT_STARTED, handleStarted);
    socket.on(SOCKET_EVENTS.MOVEMENT_RETURN, handleReturn);
    socket.on(SOCKET_EVENTS.MOVEMENT_RETURNED, handleReturn);
    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, handleQueueUpdated);
    socket.on(SOCKET_EVENTS.QUEUE_SLOT_CALLED, handleQueueSlotCalled);
    socket.on(SOCKET_EVENTS.MOVEMENT_OVERDUE, handleOverdue);
    socket.on(SOCKET_EVENTS.MOVEMENT_ESCALATED, handleEscalated);
    socket.on(
      SOCKET_EVENTS.MOVEMENT_IN_TRANSIT_UNRESOLVED,
      handleInTransitUnresolved,
    );
    socket.on(SOCKET_EVENTS.MOVEMENT_RESOLVED, handleResolved);
    socket.on(SOCKET_EVENTS.SESSION_STARTED, handleSessionStarted);
    socket.on(SOCKET_EVENTS.SESSION_ENDED, handleSessionEnded);

    return () => {
      if (isCoordination) {
        socket?.emit(SOCKET_EVENTS.LEAVE_COORDINATION);
      } else if (sessionId) {
        socket?.emit(SOCKET_EVENTS.LEAVE_SESSION, sessionId);
      }
      if (targetRoom) {
        socket?.emit(SOCKET_EVENTS.LEAVE_ROOM, targetRoom);
      }
      if (normalizedRoomCode) {
        socket?.emit(SOCKET_EVENTS.LEAVE_ROOM, {
          roomCode: normalizedRoomCode,
        });
      }

      socket?.off('connect', joinRooms);
      socket?.off(SOCKET_EVENTS.MOVEMENT_EXIT, handleStarted);
      socket?.off(SOCKET_EVENTS.MOVEMENT_STARTED, handleStarted);
      socket?.off(SOCKET_EVENTS.MOVEMENT_RETURN, handleReturn);
      socket?.off(SOCKET_EVENTS.MOVEMENT_RETURNED, handleReturn);
      socket?.off(SOCKET_EVENTS.QUEUE_UPDATED, handleQueueUpdated);
      socket?.off(SOCKET_EVENTS.QUEUE_SLOT_CALLED, handleQueueSlotCalled);
      socket?.off(SOCKET_EVENTS.MOVEMENT_OVERDUE, handleOverdue);
      socket?.off(SOCKET_EVENTS.MOVEMENT_ESCALATED, handleEscalated);
      socket?.off(
        SOCKET_EVENTS.MOVEMENT_IN_TRANSIT_UNRESOLVED,
        handleInTransitUnresolved,
      );
      socket?.off(SOCKET_EVENTS.MOVEMENT_RESOLVED, handleResolved);
      socket?.off(SOCKET_EVENTS.SESSION_STARTED, handleSessionStarted);
      socket?.off(SOCKET_EVENTS.SESSION_ENDED, handleSessionEnded);
      socket?.disconnect();
    };
  }, [enabled, sessionId, roomCode, room, isCoordination, url, autoConnect]);
}
