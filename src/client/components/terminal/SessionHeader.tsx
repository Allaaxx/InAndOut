import React, { useState } from 'react';
import { ClassSessionDTO } from '@shared/dtos';
import { Badge } from '@client/components/ui/Badge';
import { Button } from '@client/components/ui/Button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/components/ui/AlertDialog';

export interface SessionHeaderProps {
  session: ClassSessionDTO;
  elapsedFormatted: string;
  loading?: boolean;
  onEndSession: () => Promise<unknown>;
}

export function SessionHeader({
  session,
  elapsedFormatted,
  loading = false,
  onEndSession,
}: SessionHeaderProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmEnd = async () => {
    await onEndSession();
    setConfirmOpen(false);
  };

  return (
    <>
      <section
        aria-label="Cabeçalho da Sessão de Aula Ativa"
        className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant="success">Aula em Andamento</Badge>
              <span className="text-xs font-medium text-slate-600">
                Sala: {session.roomId} • Duração sugerida:{' '}
                {session.plannedDurationMinutes} min
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Turma {session.classCode} — {session.subject}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-center shadow-2xs">
              <span className="block text-xs font-medium uppercase tracking-wider text-slate-500">
                Cronômetro
              </span>
              <span
                data-testid="session-elapsed-timer"
                className="font-mono text-xl font-bold text-slate-900"
              >
                {elapsedFormatted}
              </span>
            </div>

            <Button
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={loading}
            >
              Encerrar Aula
            </Button>
          </div>
        </div>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Encerramento de Aula</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja encerrar a sessão de aula da{' '}
              <strong>
                Turma {session.classCode} ({session.subject})
              </strong>
              ? Isso fechará novos registros de saída para esta turma e
              consolidará as métricas da aula.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmEnd}
              disabled={loading}
            >
              Confirmar Encerramento
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
