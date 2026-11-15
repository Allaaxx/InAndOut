import { ActiveExitCard } from '@client/components/terminal/ActiveExitCard';
import { KeypadForm } from '@client/components/terminal/KeypadForm';
import { PinLockModal } from '@client/components/terminal/PinLockModal';
import { SessionHeader } from '@client/components/terminal/SessionHeader';
import { TeacherOverrideControls } from '@client/components/terminal/TeacherOverrideControls';
import { TerminalFooter } from '@client/components/terminal/TerminalFooter';
import { TerminalNavbar } from '@client/components/terminal/TerminalNavbar';
import { WaitingQueuePanel } from '@client/components/terminal/WaitingQueuePanel';
import { Button } from '@client/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import { useClassSession } from '@client/hooks/useClassSession';
import { useSocket } from '@client/hooks/useSocket';
import { api } from '@client/services/api';
import type { MovementDTO, UserDTO, WaitingQueueDTO } from '@shared/dtos';
import { QueueEntryStatus } from '@shared/enums';
import type React from 'react';
import { useCallback, useState } from 'react';

const CLASS_OPTIONS = ['1A', '1B', '2A', '2B', '3A', '3B'];
const SUBJECT_OPTIONS = [
  'Matemática',
  'Português',
  'História',
  'Física',
  'Química',
  'Biologia',
  'Geografia',
  'Inglês',
];

export interface TerminalPageProps {
  user: UserDTO;
  token: string;
  roomId?: string;
  onVerifyPin: (pin: string) => Promise<void>;
  onLogout: () => void;
}

export function TerminalPage({
  user,
  token,
  roomId = 'SALA-01',
  onVerifyPin,
  onLogout,
}: TerminalPageProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [selectedClassCode, setSelectedClassCode] = useState<string>('1A');
  const [selectedSubject, setSelectedSubject] = useState<string>('Matemática');
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
  } = useClassSession({ token, roomId });

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

  useSocket({
    sessionId: activeSession?.id ?? null,
    enabled: Boolean(activeSession),
    onMovementExit: handleMovementStarted,
    onMovementReturn: handleMovementReturn,
    onQueueUpdated: handleQueueUpdated,
    onQueueSlotCalled: handleQueueSlotCalled,
    onMovementOverdue: handleMovementUpdated,
    onMovementEscalated: handleMovementUpdated,
  });

  const handleUnlock = async (pin: string) => {
    await onVerifyPin(pin);
    setIsLocked(false);
  };

  const handleStartSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setReturnConfirmationMessage(null);
      setLastReturnedMovement(null);
      await startSession({
        classCode: selectedClassCode,
        subject: selectedSubject,
        roomId,
        plannedDurationMinutes: 50,
      });
    } catch {
      // Error is captured in hook state
    }
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
          roomId={roomId}
          activeSession={activeSession}
          isOccupied={isOccupied}
          isLocked={isLocked}
          onLock={() => setIsLocked(true)}
          onEndSession={endSession}
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
            </div>
          )}

          {activeSession ? (
            <>
              <SessionHeader
                session={activeSession}
                elapsedFormatted={elapsedFormatted}
                loading={loading}
                onEndSession={endSession}
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
            <Card>
              <CardHeader>
                <CardTitle>Iniciar Nova Sessão de Aula</CardTitle>
                <CardDescription>
                  Selecione a Turma e a Disciplina para liberar o registro de
                  saídas no terminal (duração sugerida: 50 minutos).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleStartSessionSubmit}
                  className="grid gap-4 sm:grid-cols-3 sm:items-end"
                >
                  <div className="flex flex-col space-y-1.5">
                    <label
                      htmlFor="session-class-select"
                      className="text-sm font-medium text-slate-700"
                    >
                      Turma
                    </label>
                    <select
                      id="session-class-select"
                      value={selectedClassCode}
                      onChange={(e) => setSelectedClassCode(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                    >
                      {CLASS_OPTIONS.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label
                      htmlFor="session-subject-select"
                      className="text-sm font-medium text-slate-700"
                    >
                      Disciplina
                    </label>
                    <select
                      id="session-subject-select"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                    >
                      {SUBJECT_OPTIONS.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      Iniciar Sessão de Aula
                    </Button>
                  </div>
                </form>

                {error && (
                  <p role="alert" className="mt-3 text-sm text-red-600">
                    {error}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      <TerminalFooter />

      <PinLockModal
        open={isLocked}
        teacherName={user.name}
        onUnlock={handleUnlock}
        onLogout={onLogout}
      />
    </div>
  );
}
