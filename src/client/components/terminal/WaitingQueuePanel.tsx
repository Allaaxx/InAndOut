import { Badge } from '@client/components/ui/Badge';
import { Button } from '@client/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import { api } from '@client/services/api';
import type { MovementDTO, WaitingQueueDTO } from '@shared/dtos';
import { QueueEntryStatus } from '@shared/enums';
import { useEffect, useState } from 'react';

export interface WaitingQueuePanelProps {
  sessionId: string;
  queue: WaitingQueueDTO[];
  token?: string;
  onQueueUpdated?: (queue: WaitingQueueDTO[]) => void;
  onMovementStarted?: (movement: MovementDTO) => void;
  onCancelQueue?: (ra: string) => Promise<void> | void;
}

function formatRemainingSeconds(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safeSec / 60);
  const s = safeSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WaitingQueuePanel({
  sessionId,
  queue,
  token,
  onQueueUpdated,
  onMovementStarted,
  onCancelQueue,
}: WaitingQueuePanelProps) {
  const [loading, setLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calledEntry = queue.find(
    (item) => item.status === QueueEntryStatus.CALLED,
  );

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (!calledEntry?.expiresAt) return 0;
    const expiresMs = new Date(calledEntry.expiresAt).getTime();
    return Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!calledEntry?.expiresAt) {
      setRemainingSeconds(0);
      return;
    }

    const expiresAt = calledEntry.expiresAt;
    const updateRemaining = () => {
      const expiresMs = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000));
      setRemainingSeconds(diff);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [calledEntry?.expiresAt]);

  const handleCancel = async (ra: string) => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      if (onCancelQueue) {
        await onCancelQueue(ra);
      } else {
        const response = await api.cancelQueue(ra, sessionId, token);
        onQueueUpdated?.(response.queue);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao cancelar vaga na fila de espera.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (ra: string) => {
    if (claimLoading) return;
    setError(null);
    setClaimLoading(true);
    try {
      const response = await api.claimQueueSlot({ ra, sessionId }, token);
      onMovementStarted?.(response.movement);
      onQueueUpdated?.(response.queue);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao confirmar saída da fila.',
      );
    } finally {
      setClaimLoading(false);
    }
  };

  const nextStudent = queue.length > 0 ? queue[0] : null;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Fila de Espera Virtual (FIFO)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Ordem de saída com reserva automática e janela de 2 minutos.
            </CardDescription>
          </div>
          <Badge variant={queue.length > 0 ? 'warning' : 'outline'}>
            {queue.length} {queue.length === 1 ? 'na fila' : 'na fila'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Discreet next-in-line indicator */}
        {nextStudent && (
          <div
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
            data-testid="queue-next-indicator"
          >
            <span>
              Próximo:{' '}
              <span className="font-semibold text-slate-900">
                {nextStudent.studentPublicName || nextStudent.abbreviatedName}
              </span>
            </span>
            <span className="text-xs text-slate-500 font-mono">Posição #1</span>
          </div>
        )}

        {/* 2-minute confirmation window callout */}
        {calledEntry && (
          <div
            role="alert"
            aria-live="polite"
            data-testid="called-student-alert"
            className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950 shadow-xs"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-sm">
                  Vaga liberada para{' '}
                  {calledEntry.studentPublicName || calledEntry.abbreviatedName}
                  !
                </p>
                <p className="text-xs text-amber-800">
                  Janela de confirmação:{' '}
                  <span className="font-mono font-bold">
                    {formatRemainingSeconds(remainingSeconds)}
                  </span>{' '}
                  restantes
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium self-start sm:self-auto"
                onClick={() => handleClaim(calledEntry.studentRa)}
                disabled={claimLoading || remainingSeconds <= 0}
              >
                {claimLoading ? 'Confirmando...' : 'Confirmar Saída'}
              </Button>
            </div>
          </div>
        )}

        {/* Queue items list */}
        {queue.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-2">
            Nenhum aluno na fila de espera no momento.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100" data-testid="queue-list">
            {queue.map((item) => (
              <li
                key={item.id || item.studentRa}
                className="flex items-center justify-between py-2 text-sm"
                data-testid={`queue-item-${item.studentRa}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    #{item.position}
                  </span>
                  <span className="font-medium text-slate-800">
                    {item.studentPublicName || item.abbreviatedName}
                  </span>
                  <Badge
                    variant={
                      item.status === QueueEntryStatus.CALLED
                        ? 'warning'
                        : 'secondary'
                    }
                  >
                    {item.status === QueueEntryStatus.CALLED
                      ? 'Aguardando Confirmação'
                      : 'Na Fila'}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                  onClick={() => handleCancel(item.studentRa)}
                  disabled={loading}
                  data-testid={`cancel-queue-${item.studentRa}`}
                >
                  Desistir
                </Button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-medium text-red-700"
          >
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
