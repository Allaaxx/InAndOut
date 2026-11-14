import React, { useState } from 'react';
import { UserDTO } from '@shared/dtos';
import { Button } from '@client/components/ui/Button';
import { Badge } from '@client/components/ui/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import { PinLockModal } from '@client/components/terminal/PinLockModal';
import { SessionHeader } from '@client/components/terminal/SessionHeader';
import { useClassSession } from '@client/hooks/useClassSession';

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

  const {
    activeSession,
    loading,
    error,
    elapsedFormatted,
    lastEndedSummary,
    startSession,
    endSession,
  } = useClassSession({ token, roomId });

  const handleUnlock = async (pin: string) => {
    await onVerifyPin(pin);
    setIsLocked(false);
  };

  const handleStartSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mx-auto max-w-5xl flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Terminal de Sala — Escola Lins do Rego
            </h1>
            <p className="text-sm text-slate-600">
              Professor(a): <span className="font-medium">{user.name}</span>
            </p>
          </div>
          <Badge variant={isLocked ? 'warning' : 'success'}>
            {isLocked ? 'Bloqueado' : 'Sala Liberada'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsLocked(true)}
            disabled={isLocked}
          >
            Bloquear Terminal
          </Button>
          <Button variant="ghost" onClick={onLogout}>
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-5xl space-y-6">
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

            <Card>
              <CardHeader>
                <CardTitle>Controle de Fluxo de Saída de Alunos</CardTitle>
                <CardDescription>
                  Terminal pronto para registro de saídas e retornos dos
                  estudantes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  Utilize o botão &ldquo;Bloquear Terminal&rdquo; durante
                  transições de aula e desbloqueie rapidamente com seu PIN de 4
                  dígitos.
                </p>
              </CardContent>
            </Card>
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

      <PinLockModal
        open={isLocked}
        teacherName={user.name}
        onUnlock={handleUnlock}
        onLogout={onLogout}
      />
    </div>
  );
}
