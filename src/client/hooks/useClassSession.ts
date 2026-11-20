import { api } from '@client/services/api';
import type {
  ClassSessionDTO,
  EndSessionResponseDTO,
  MovementDTO,
  StartSessionRequestDTO,
  WaitingQueueDTO,
} from '@shared/dtos';
import { DEFAULT_ROOM_CODE } from '@shared/roomCode';
import { useCallback, useEffect, useState } from 'react';

export function formatElapsedSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export interface UseClassSessionOptions {
  token: string;
  roomId?: string;
}

export function useClassSession({
  token,
  roomId = DEFAULT_ROOM_CODE,
}: UseClassSessionOptions) {
  const [activeSession, setActiveSession] = useState<ClassSessionDTO | null>(
    null,
  );
  const [activeMovements, setActiveMovements] = useState<MovementDTO[]>([]);
  const [queue, setQueue] = useState<WaitingQueueDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastEndedSummary, setLastEndedSummary] =
    useState<EndSessionResponseDTO | null>(null);

  const computeElapsedSeconds = useCallback((startedAtIso: string) => {
    const startedMs = new Date(startedAtIso).getTime();
    if (Number.isNaN(startedMs)) return 0;
    return Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
  }, []);

  const refreshActiveSession = useCallback(async () => {
    if (typeof api.getActiveSession !== 'function') {
      return;
    }
    try {
      const response = await api.getActiveSession(roomId, token);
      if (response?.session) {
        setActiveSession(response.session);
        setActiveMovements(response.activeMovements ?? []);
        setQueue(response.queue ?? []);
        setElapsedSeconds(computeElapsedSeconds(response.session.startedAt));
      } else {
        setActiveSession(null);
        setActiveMovements([]);
        setQueue([]);
        setElapsedSeconds(0);
      }
    } catch {
      // Ignore initial fetch errors if no active session
    }
  }, [roomId, token, computeElapsedSeconds]);

  useEffect(() => {
    void refreshActiveSession();
  }, [refreshActiveSession]);

  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    setElapsedSeconds(computeElapsedSeconds(activeSession.startedAt));
    const interval = setInterval(() => {
      setElapsedSeconds(computeElapsedSeconds(activeSession.startedAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, computeElapsedSeconds]);

  const startSession = async (payload: StartSessionRequestDTO) => {
    setError(null);
    setLoading(true);
    try {
      const response = await api.startSession(
        {
          roomId,
          plannedDurationMinutes: 50,
          defaultTimeLimitMinutes: 10,
          ...payload,
        },
        token,
      );
      setLastEndedSummary(null);
      setActiveSession(response.session);
      setActiveMovements([]);
      setQueue([]);
      setElapsedSeconds(computeElapsedSeconds(response.session.startedAt));
      return response.session;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao iniciar sessão de aula.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (!activeSession) return null;
    setError(null);
    setLoading(true);
    try {
      const response = await api.endSession(
        { sessionId: activeSession.id },
        token,
      );
      setActiveSession(null);
      setActiveMovements([]);
      setQueue([]);
      setElapsedSeconds(0);
      setLastEndedSummary(response);
      return response;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao encerrar sessão de aula.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const applyRemoteSessionStarted = useCallback(
    (session: ClassSessionDTO) => {
      setError(null);
      setLastEndedSummary(null);
      setActiveSession(session);
      setActiveMovements([]);
      setQueue([]);
      setElapsedSeconds(computeElapsedSeconds(session.startedAt));
    },
    [computeElapsedSeconds],
  );

  const applyRemoteSessionEnded = useCallback(
    (summary: EndSessionResponseDTO) => {
      setError(null);
      setActiveSession(null);
      setActiveMovements([]);
      setQueue([]);
      setElapsedSeconds(0);
      setLastEndedSummary(summary);
    },
    [],
  );

  return {
    activeSession,
    activeMovements,
    setActiveMovements,
    queue,
    setQueue,
    loading,
    error,
    elapsedSeconds,
    elapsedFormatted: formatElapsedSeconds(elapsedSeconds),
    lastEndedSummary,
    startSession,
    endSession,
    refreshActiveSession,
    applyRemoteSessionStarted,
    applyRemoteSessionEnded,
  };
}
