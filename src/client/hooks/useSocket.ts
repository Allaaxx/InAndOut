import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MovementDTO } from '@shared/dtos';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '@shared/events';

const SOCKET_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_API_URL) ||
  'http://localhost:3333';

export interface UseSocketOptions {
  sessionId?: string | null;
  enabled?: boolean;
  onMovementExit?: (movement: MovementDTO) => void;
  onMovementStarted?: (movement: MovementDTO) => void;
  onMovementReturn?: (movement: MovementDTO) => void;
}

export function useSocket({
  sessionId,
  enabled = true,
  onMovementExit,
  onMovementStarted,
  onMovementReturn,
}: UseSocketOptions) {
  const callbacksRef = useRef({
    onMovementExit,
    onMovementStarted,
    onMovementReturn,
  });

  useEffect(() => {
    callbacksRef.current = {
      onMovementExit,
      onMovementStarted,
      onMovementReturn,
    };
  }, [onMovementExit, onMovementStarted, onMovementReturn]);

  useEffect(() => {
    if (!enabled || !sessionId) {
      return;
    }

    const isTestEnv =
      typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

    let socket: Socket | null = null;
    try {
      socket = io(SOCKET_URL, {
        autoConnect: !isTestEnv,
        transports: ['websocket', 'polling'],
      });
    } catch {
      return;
    }

    if (!socket) return;

    const handleStarted = (movement: MovementDTO) => {
      if (movement.sessionId && movement.sessionId !== sessionId) return;
      callbacksRef.current.onMovementExit?.(movement);
      callbacksRef.current.onMovementStarted?.(movement);
    };

    const handleReturn = (movement: MovementDTO) => {
      if (movement.sessionId && movement.sessionId !== sessionId) return;
      callbacksRef.current.onMovementReturn?.(movement);
    };

    socket.emit('join:room', SOCKET_ROOMS.sessionRoom(sessionId));
    socket.on(SOCKET_EVENTS.MOVEMENT_EXIT, handleStarted);
    socket.on(SOCKET_EVENTS.MOVEMENT_STARTED, handleStarted);
    socket.on(SOCKET_EVENTS.MOVEMENT_RETURN, handleReturn);

    return () => {
      socket?.off(SOCKET_EVENTS.MOVEMENT_EXIT, handleStarted);
      socket?.off(SOCKET_EVENTS.MOVEMENT_STARTED, handleStarted);
      socket?.off(SOCKET_EVENTS.MOVEMENT_RETURN, handleReturn);
      socket?.disconnect();
    };
  }, [enabled, sessionId]);
}
