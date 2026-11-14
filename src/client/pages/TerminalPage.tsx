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

export interface TerminalPageProps {
  user: UserDTO;
  token: string;
  onVerifyPin: (pin: string) => Promise<void>;
  onLogout: () => void;
}

export function TerminalPage({
  user,
  onVerifyPin,
  onLogout,
}: TerminalPageProps) {
  const [isLocked, setIsLocked] = useState(false);

  const handleUnlock = async (pin: string) => {
    await onVerifyPin(pin);
    setIsLocked(false);
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

      <main className="mx-auto mt-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Controle de Fluxo de Saída de Alunos</CardTitle>
            <CardDescription>
              Terminal autenticado e pronto para operação em sala de aula.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Utilize o botão &ldquo;Bloquear Terminal&rdquo; durante transições
              de aula e desbloqueie rapidamente com seu PIN de 4 dígitos.
            </p>
          </CardContent>
        </Card>
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
