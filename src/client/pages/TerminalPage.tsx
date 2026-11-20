import { ActiveExitCard } from '@client/components/terminal/ActiveExitCard';
import { KeypadForm } from '@client/components/terminal/KeypadForm';
import { PinLockModal } from '@client/components/terminal/PinLockModal';
import { RoomSelectionModal } from '@client/components/terminal/RoomSelectionModal';
import { SessionHeader } from '@client/components/terminal/SessionHeader';
import { StartSessionModal } from '@client/components/terminal/StartSessionModal';
import { TeacherOverrideControls } from '@client/components/terminal/TeacherOverrideControls';
import { TerminalFooter } from '@client/components/terminal/TerminalFooter';
import { TerminalIdleState } from '@client/components/terminal/TerminalIdleState';
import { TerminalNavbar } from '@client/components/terminal/TerminalNavbar';
import { WaitingQueuePanel } from '@client/components/terminal/WaitingQueuePanel';
import { useClassSession } from '@client/hooks/useClassSession';
import { useSocket } from '@client/hooks/useSocket';
import { api } from '@client/services/api';
import { normalizeRoomCode, saveRoomCode } from '@client/services/roomStorage';
import type {
  EndSessionResponseDTO,
  MovementDTO,
  RoomDTO,
  StartSessionResponseDTO,
  UserDTO,
  WaitingQueueDTO,
} from '@shared/dtos';
import { QueueEntryStatus, SessionStatus } from '@shared/enums';
import { useCallback, useState } from 'react';

const IDLE_NO_SESSION_FEEDBACK =
  'Não há aula ativa nesta sala no momento. Aguarde o professor iniciar a sessão de aula para registrar saídas.';

export interface TerminalPageProps {
  user: UserDTO;
  token: string;
  roomId?: string;
  onChangeRoom?: (roomCode: string) => void;
  onVerifyPin: (pin: string) => Promise<void>;
  onLogout: () => void;
}

export function TerminalPage({
  user,
  token,
  roomId = 'SALA-01',
  onChangeRoom,
  onVerifyPin,
  onLogout,
}: TerminalPageProps) {
  const normalizedRoomId = normalizeRoomCode(roomId);
  const [isLocked, setIsLocked] = useState(false);
  const [startSessionOpen, setStartSessionOpen] = useState(false);
  const [changeRoomOpen, setChangeRoomOpen] = useState(false);
  const [idleRaFeedback, setIdleRaFeedback] = useState<string | null>(null);
  const [movementLoading, setMovementLoading] = useState(false);
  const [movementError, setMovementError] = useState<string | null>(null);
  const [queueFeedback, setQueueFeedback] = useState<{
    ra: string;
    position: number;
    message: string;
  } | null>(null);
  const [returnConfirmationMessage, setReturnConfirmationMessage] = useState<
    string | null
  >(null);
  const [lastReturnedMovement, setLastReturnedMovement] =
    useState<MovementDTO | null>(null);

  const {
    activeSession,
    activeMovements,
    setActiveMovements,
    queue,
    setQueue,
    loading,
    error,
    elapsedFormatted,
    lastEndedSummary,
    startSession,
    endSession,
    applyRemoteSessionStarted,
    applyRemoteSessionEnded,
  } = useClassSession({ token, roomId: normalizedRoomId });

  const handleMovementStarted = useCallback(
    (movement: MovementDTO) => {
      setReturnConfirmationMessage(null);
      setActiveMovements((prev) => {
        const exists = prev.some((m) => m.id === movement.id);
        return exists ? prev : [...prev, movement];
      });
    },
    [setActiveMovements],
  );

  const handleMovementUpdated = useCallback(
    (movement: MovementDTO) => {
      setActiveMovements((prev) =>
        prev.map((m) => (m.id === movement.id ? movement : m)),
      );
    },
    [setActiveMovements],
  );

  const handleMovementReturn = useCallback(
    (movement: MovementDTO) => {
      setActiveMovements((prev) =>
        prev.filter(
          (m) => m.id !== movement.id && m.studentRa !== movement.studentRa,
        ),
      );
      setLastReturnedMovement(movement);
      setReturnConfirmationMessage('Retorno registrado com sucesso');
    },
    [setActiveMovements],
  );

  const handleQueueUpdated = useCallback(
    (payload: { sessionId: string; queue: WaitingQueueDTO[] }) => {
      setQueue(payload.queue);
    },
    [setQueue],
  );

  const handleQueueSlotCalled = useCallback(
    (payload: {
      sessionId: string;
      entry: WaitingQueueDTO;
      expiresAt: string;
    }) => {
      setQueue((prev) => {
        const exists = prev.some(
          (q) => q.studentRa === payload.entry.studentRa,
        );
        if (exists) {
          return prev.map((q) =>
            q.studentRa === payload.entry.studentRa
              ? { ...q, ...payload.entry, expiresAt: payload.expiresAt }
              : q,
          );
        }
        return [...prev, { ...payload.entry, expiresAt: payload.expiresAt }];
      });
    },
    [setQueue],
  );

  const clearTransientTerminalFeedback = useCallback(() => {
    setMovementError(null);
    setQueueFeedback(null);
    setReturnConfirmationMessage(null);
    setLastReturnedMovement(null);
    setIdleRaFeedback(null);
  }, []);

  const handleSessionStarted = useCallback(
    (payload: StartSessionResponseDTO) => {
      if (!payload?.session?.roomId) return;
      if (normalizeRoomCode(payload.session.roomId) !== normalizedRoomId) {
        return;
      }
      clearTransientTerminalFeedback();
      setChangeRoomOpen(false);
      setStartSessionOpen(false);
      applyRemoteSessionStarted(payload.session);
    },
    [
      normalizedRoomId,
      clearTransientTerminalFeedback,
      applyRemoteSessionStarted,
    ],
  );

  const handleSessionEnded = useCallback(
    (payload: EndSessionResponseDTO) => {
      if (!payload?.session?.roomId) return;
      if (normalizeRoomCode(payload.session.roomId) !== normalizedRoomId) {
        return;
      }
      clearTransientTerminalFeedback();
      applyRemoteSessionEnded(payload);
    },
    [normalizedRoomId, clearTransientTerminalFeedback, applyRemoteSessionEnded],
  );

  useSocket({
    roomCode: normalizedRoomId,
    sessionId: activeSession?.id ?? null,
    enabled: Boolean(normalizedRoomId),
    onMovementExit: handleMovementStarted,
    onMovementReturn: handleMovementReturn,
    onQueueUpdated: handleQueueUpdated,
    onQueueSlotCalled: handleQueueSlotCalled,
    onMovementOverdue: handleMovementUpdated,
    onMovementEscalated: handleMovementUpdated,
    onSessionStarted: handleSessionStarted,
    onSessionEnded: handleSessionEnded,
  });

  const handleEndSession = useCallback(async () => {
    const response = await endSession();
    if (response) {
      clearTransientTerminalFeedback();
      setChangeRoomOpen(false);
    }
    return response;
  }, [endSession, clearTransientTerminalFeedback]);

  const handleUnlock = async (pin: string) => {
    await onVerifyPin(pin);
    setIsLocked(false);
  };

  const handleStartSessionSubmit = async ({
    classCode,
    subject,
  }: {
    classCode: string;
    subject: string;
  }) => {
    try {
      setReturnConfirmationMessage(null);
      setLastReturnedMovement(null);
      setIdleRaFeedback(null);
      await startSession({
        classCode,
        subject,
        roomId: normalizedRoomId,
        plannedDurationMinutes: 50,
      });
      setStartSessionOpen(false);
    } catch {
      // Error is captured in hook state
    }
  };

  const handleIdleKeypadSubmit = async (_ra: string) => {
    setIdleRaFeedback(IDLE_NO_SESSION_FEEDBACK);
  };

  const isSessionActive = activeSession?.status === SessionStatus.ACTIVE;

  const handleOpenChangeRoom = () => {
    if (isSessionActive) return;
    setChangeRoomOpen(true);
  };

  const handleSelectNewRoom = (room: RoomDTO) => {
    if (isSessionActive) return;
    const nextCode = normalizeRoomCode(room.code);
    saveRoomCode(nextCode);
    setChangeRoomOpen(false);
    setIdleRaFeedback(null);
    onChangeRoom?.(nextCode);
  };

  const handleRegisterReturn = async (ra: string) => {
    if (!activeSession || typeof api.registerReturn !== 'function') return;
    setMovementError(null);
    setMovementLoading(true);
    try {
      const response = await api.registerReturn(
        {
          ra: ra.trim(),
          sessionId: activeSession.id,
        },
        token,
      );
      handleMovementReturn(response.movement);
      if (response.nextCalledQueueEntry) {
        const nextEntry = response.nextCalledQueueEntry;
        setQueue((prev) =>
          prev.map((q) =>
            q.studentRa === nextEntry.studentRa ? nextEntry : q,
          ),
        );
      }
      if (response.message) {
        setReturnConfirmationMessage(response.message);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao registrar retorno do aluno.';
      setMovementError(msg);
      throw err;
    } finally {
      setMovementLoading(false);
    }
  };

  const handleCancelQueue = useCallback(
    async (ra: string) => {
      if (!activeSession) return;
      setMovementLoading(true);
      setMovementError(null);
      try {
        const response = await api.cancelQueue(ra, activeSession.id, token);
        setQueue(response.queue);
        setQueueFeedback((prev) => (prev?.ra === ra ? null : prev));
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Erro ao cancelar vaga na fila de espera.';
        setMovementError(msg);
        throw err;
      } finally {
        setMovementLoading(false);
      }
    },
    [activeSession, token, setQueue],
  );

  const handleKeypadSubmit = async (ra: string) => {
    if (!activeSession) return;
    const normalizedRa = ra.trim();
    if (!normalizedRa) return;

    // 1. If student is currently outside -> register return
    const isCurrentlyOut = activeMovements.some(
      (m) => m.studentRa === normalizedRa,
    );
    if (isCurrentlyOut && typeof api.registerReturn === 'function') {
      await handleRegisterReturn(normalizedRa);
      setQueueFeedback(null);
      return;
    }

    // 2. If student is CALLED in the queue -> confirm exit (claim slot)
    const isCalled = queue.some(
      (q) =>
        q.studentRa === normalizedRa && q.status === QueueEntryStatus.CALLED,
    );
    if (isCalled && typeof api.claimQueueSlot === 'function') {
      setMovementError(null);
      setMovementLoading(true);
      try {
        const response = await api.claimQueueSlot(
          {
            ra: normalizedRa,
            sessionId: activeSession.id,
          },
          token,
        );
        handleMovementStarted(response.movement);
        setQueue(response.queue);
        setQueueFeedback(null);
        return;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Erro ao confirmar saída da fila.';
        setMovementError(msg);
        throw err;
      } finally {
        setMovementLoading(false);
      }
    }

    // 3. If student is already WAITING in the queue -> display position feedback / allow cancel
    const waitingEntry = queue.find(
      (q) =>
        q.studentRa === normalizedRa && q.status === QueueEntryStatus.WAITING,
    );
    if (waitingEntry) {
      setMovementError(null);
      setReturnConfirmationMessage(null);

      // If student already saw their position feedback and enters RA again, cancel queue (ADR 0006 & User Story 4)
      if (queueFeedback?.ra === normalizedRa) {
        await handleCancelQueue(normalizedRa);
        return;
      }

      setQueueFeedback({
        ra: normalizedRa,
        position: waitingEntry.position,
        message: `Você já está na posição #${waitingEntry.position} da fila`,
      });
      return;
    }

    // 4. If room is already occupied or a student is CALLED -> Auto-Enfileiramento por RA
    const hasCalledStudent = queue.some(
      (q) => q.status === QueueEntryStatus.CALLED,
    );
    const isRoomOccupied = activeMovements.length > 0 || hasCalledStudent;

    if (isRoomOccupied) {
      if (typeof api.enqueueWaiting !== 'function') return;
      setMovementError(null);
      setMovementLoading(true);
      try {
        const response = await api.enqueueWaiting(
          {
            ra: normalizedRa,
            sessionId: activeSession.id,
          },
          token,
        );
        setQueue(response.queue);
        setQueueFeedback(null);
        return;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Erro ao entrar na fila de espera.';
        setMovementError(msg);
        throw err;
      } finally {
        setMovementLoading(false);
      }
    }

    // 5. If room is free -> request normal exit
    if (typeof api.requestExit !== 'function') return;
    setMovementError(null);
    setMovementLoading(true);
    try {
      const response = await api.requestExit(
        {
          ra: normalizedRa,
          sessionId: activeSession.id,
        },
        token,
      );
      handleMovementStarted(response.movement);
      setQueueFeedback(null);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao registrar saída do aluno.';
      setMovementError(msg);
      throw err;
    } finally {
      setMovementLoading(false);
    }
  };

  const isOccupied = activeMovements.length > 0;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50">
      <div>
        <TerminalNavbar
          user={user}
          roomId={normalizedRoomId}
          activeSession={activeSession}
          isOccupied={isOccupied}
          isLocked={isLocked}
          onLock={() => setIsLocked(true)}
          onChangeRoom={handleOpenChangeRoom}
          onEndSession={handleEndSession}
          onLogout={onLogout}
        />

        <main className="mx-auto my-6 max-w-5xl px-4 space-y-6 w-full">
          {lastEndedSummary && !activeSession && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            >
              <p className="font-semibold">
                Sessão de aula encerrada ({lastEndedSummary.session.classCode} —{' '}
                {lastEndedSummary.session.subject})
              </p>
              <p className="mt-1 text-emerald-800">
                Métricas consolidadas: {lastEndedSummary.metrics.totalExits}{' '}
                saída(s) registrada(s) • Duração:{' '}
                {lastEndedSummary.metrics.elapsedMinutes} min.
              </p>
              {lastEndedSummary.metrics.inTransitUnresolvedCount > 0 && (
                <p className="mt-1 font-medium text-amber-800">
                  {lastEndedSummary.metrics.inTransitUnresolvedCount} saída(s)
                  em trânsito encaminhada(s) à Coordenação
                  (IN_TRANSIT_UNRESOLVED).
                </p>
              )}
            </div>
          )}

          {activeSession ? (
            <>
              <SessionHeader
                session={activeSession}
                elapsedFormatted={elapsedFormatted}
                loading={loading}
                onEndSession={handleEndSession}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <KeypadForm
                  loading={movementLoading}
                  error={movementError}
                  onSubmitRa={handleKeypadSubmit}
                  onReturnRa={handleRegisterReturn}
                  queueFeedback={queueFeedback}
                  onCancelQueue={handleCancelQueue}
                />

                <div className="space-y-6">
                  <ActiveExitCard
                    activeMovements={activeMovements}
                    sessionId={activeSession.id}
                    token={token}
                    returnConfirmationMessage={returnConfirmationMessage}
                    lastReturnedMovement={lastReturnedMovement}
                    onMovementUpdated={handleMovementUpdated}
                  />

                  <WaitingQueuePanel
                    sessionId={activeSession.id}
                    queue={queue}
                    token={token}
                    onQueueUpdated={setQueue}
                    onMovementStarted={handleMovementStarted}
                    onCancelQueue={handleCancelQueue}
                  />
                </div>
              </div>

              <TeacherOverrideControls
                sessionId={activeSession.id}
                classCode={activeSession.classCode}
                token={token}
                onMovementStarted={handleMovementStarted}
              />
            </>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 items-start">
              <TerminalIdleState
                roomId={normalizedRoomId}
                onStartSessionClick={() => setStartSessionOpen(true)}
                onChangeRoomClick={handleOpenChangeRoom}
              />

              <KeypadForm
                loading={false}
                error={idleRaFeedback}
                onSubmitRa={handleIdleKeypadSubmit}
                onReturnRa={handleIdleKeypadSubmit}
              />
            </div>
          )}
        </main>
      </div>

      <TerminalFooter />

      <StartSessionModal
        open={startSessionOpen}
        onOpenChange={setStartSessionOpen}
        roomId={normalizedRoomId}
        loading={loading}
        error={error}
        onStartSession={handleStartSessionSubmit}
      />

      <RoomSelectionModal
        open={changeRoomOpen && !isSessionActive}
        onOpenChange={setChangeRoomOpen}
        token={token}
        currentRoomCode={normalizedRoomId}
        dismissible={true}
        onSelectRoom={handleSelectNewRoom}
      />

      <PinLockModal
        open={isLocked}
        teacherName={user.name}
        onUnlock={handleUnlock}
        onLogout={onLogout}
      />
    </div>
  );
}
