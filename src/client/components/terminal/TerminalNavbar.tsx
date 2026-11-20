import { UserMenuDropdown } from '@client/components/shared/UserMenuDropdown';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/components/ui/AlertDialog';
import { Badge } from '@client/components/ui/Badge';
import { Button } from '@client/components/ui/Button';
import {
  DropdownMenuGroup,
  DropdownMenuItem,
} from '@client/components/ui/DropdownMenu';
import { cn } from '@client/components/ui/utils';
import type { ClassSessionDTO, UserDTO } from '@shared/dtos';
import { Lock, PowerOff, RefreshCwIcon } from 'lucide-react';
import { useState } from 'react';

export interface TerminalNavbarProps {
  user: UserDTO;
  roomId?: string;
  activeSession?: ClassSessionDTO | null;
  isOccupied?: boolean;
  isLocked?: boolean;
  onLock: () => void;
  onEndSession?: () => unknown;
  onLogout: () => void;
  className?: string;
}

export function TerminalNavbar({
  user,
  roomId = 'SALA-01',
  activeSession,
  isOccupied = false,
  isLocked = false,
  onLock,
  onEndSession,
  onLogout,
  className,
}: TerminalNavbarProps) {
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  const handleConfirmEndSession = async () => {
    if (onEndSession) {
      await onEndSession();
    }
    setConfirmEndOpen(false);
  };

  const displayRoomId = activeSession?.roomId || roomId;

  return (
    <>
      <header
        className={cn(
          'w-full border-b border-slate-200 bg-white/95 backdrop-blur-xs shadow-2xs px-4 py-3 sm:px-6',
          className,
        )}
      >
        <div className="mx-auto flex flex-col sm:flex-row max-w-5xl items-center justify-between gap-4">
          {/* Brand & Room/Class Info */}
          <div className="flex justify-start flex-col sm:flex-row gap-4 min-w-0">
            <div className="flex items-center gap-3">
              <div
                data-testid="sidebar-school-icon"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs"
              >
                <RefreshCwIcon className="h-4 w-4" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight text-slate-900 block">
                  InAndOut
                </span>
                <span className="text-xs text-slate-500 block">
                  Terminal de sala
                </span>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-200" />

            <div className="min-w-0 flex items-center">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 text-sm">
                  {displayRoomId}
                </span>
                {activeSession ? (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-sm font-medium text-slate-700">
                      Turma {activeSession.classCode}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-sm text-slate-600">
                      {activeSession.subject}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500 italic">
                      Aguardando início de aula
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge & Teacher User Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            <Badge
              variant={isOccupied ? 'warning' : 'success'}
              data-testid="concurrency-badge"
              className="text-xs px-2.5 py-1"
            >
              {isOccupied ? 'Em Atendimento' : 'Sala Liberada'}
            </Badge>

            <UserMenuDropdown
              user={user}
              roleLabel="Docente"
              triggerAriaLabel="Ações do Professor"
              triggerTestId="teacher-profile-dropdown-trigger"
              onLogout={onLogout}
              logoutLabel="Sair / Logout"
            >
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={onLock} disabled={isLocked}>
                  <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                  <span>Bloquear Terminal</span>
                </DropdownMenuItem>

                {activeSession && onEndSession && (
                  <DropdownMenuItem
                    onSelect={() => setConfirmEndOpen(true)}
                    className="text-amber-700 focus:bg-amber-50 focus:text-amber-800"
                  >
                    <PowerOff className="h-4 w-4 shrink-0" />
                    <span>Encerrar Sessão de Aula</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </UserMenuDropdown>
          </div>
        </div>
      </header>

      {/* Confirmation Dialog for Ending Session from Dropdown */}
      <AlertDialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Encerramento de Aula</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja encerrar a sessão de aula ativa da{' '}
              <strong>
                Turma {activeSession?.classCode} ({activeSession?.subject})
              </strong>
              ? Novos registros de saída serão interrompidos e as métricas da
              aula serão consolidadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirmEndOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmEndSession}>
              Confirmar Encerramento
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
