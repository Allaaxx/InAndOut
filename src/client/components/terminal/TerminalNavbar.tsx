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
import { cn } from '@client/components/ui/utils';
import type { ClassSessionDTO, UserDTO } from '@shared/dtos';
import { Lock, LogOut, MoreVertical, PowerOff, School } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu on click outside or Escape
  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          {/* Brand & Room/Class Info */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                <School className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                  InAndOut
                </span>
                <span className="text-2xs text-slate-500 font-medium block">
                  Terminal de Sala
                </span>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-200" />

            <div className="min-w-0">
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
              <p className="text-xs text-slate-500 truncate">
                Docente:{' '}
                <span className="font-medium text-slate-700">{user.name}</span>
              </p>
            </div>
          </div>

          {/* Status Badge, Lock Button & Teacher Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Single concurrency badge */}
            <Badge
              variant={isOccupied ? 'warning' : 'success'}
              data-testid="concurrency-badge"
              className="text-xs px-2.5 py-1"
            >
              {isOccupied ? 'Em Atendimento' : 'Sala Liberada'}
            </Badge>

            {/* Quick 1-touch screen lock */}
            <Button
              variant="outline"
              size="sm"
              onClick={onLock}
              disabled={isLocked}
              className="flex items-center gap-1.5"
            >
              <Lock className="h-4 w-4" />
              <span>Bloquear Terminal</span>
            </Button>

            {/* Discreet dropdown menu for teacher actions */}
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Ações do Professor"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="h-9 w-9 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>

              {isMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-50 animate-in fade-in-0 zoom-in-95"
                >
                  <div className="px-3 py-2 border-b border-slate-100 text-xs">
                    <p className="font-semibold text-slate-800 truncate">
                      {user.name}
                    </p>
                    <p className="text-slate-500 truncate">{user.email}</p>
                  </div>

                  <div className="pt-1 space-y-1">
                    {activeSession && onEndSession && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setConfirmEndOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 rounded-lg text-left font-medium transition-colors"
                      >
                        <PowerOff className="h-4 w-4 shrink-0" />
                        <span>Encerrar Sessão de Aula</span>
                      </button>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left font-medium transition-colors"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span>Sair / Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
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
