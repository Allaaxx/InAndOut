import { Badge } from '@client/components/ui/Badge';
import { Button } from '@client/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/Dialog';
import { api } from '@client/services/api';
import type { RoomDTO } from '@shared/dtos';
import { normalizeRoomCode } from '@shared/roomCode';
import { DoorOpen, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export interface RoomSelectionModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  token: string;
  currentRoomCode?: string;
  dismissible?: boolean;
  onSelectRoom: (room: RoomDTO) => void;
}

export function RoomSelectionModal({
  open,
  onOpenChange,
  token,
  currentRoomCode,
  dismissible = true,
  onSelectRoom,
}: RoomSelectionModalProps) {
  const [rooms, setRooms] = useState<RoomDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedCurrentCode = currentRoomCode
    ? normalizeRoomCode(currentRoomCode)
    : null;

  const fetchRooms = useCallback(async () => {
    if (typeof api.listRooms !== 'function') {
      setRooms([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.listRooms(token, { onlyActive: true });
      setRooms(response.rooms ?? []);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao carregar salas disponíveis.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open) {
      void fetchRooms();
    }
  }, [open, fetchRooms]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!dismissible && !nextOpen) {
      return;
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={dismissible}
        onEscapeKeyDown={(e) => {
          if (!dismissible) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (!dismissible) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-indigo-600" />
            <span>Selecionar Sala de Aula</span>
          </DialogTitle>
          <DialogDescription>
            Escolha a sala física onde este terminal está operando. A sala
            selecionada será memorizada neste dispositivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-80 overflow-y-auto py-1">
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Carregando salas disponíveis...
            </p>
          ) : error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-center space-y-3"
            >
              <p className="text-sm text-red-700">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void fetchRooms()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : rooms.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Nenhuma sala ativa disponível no momento. Solicite à Coordenação o
              cadastro de salas.
            </p>
          ) : (
            rooms.map((room) => {
              const isCurrent =
                normalizedCurrentCode === normalizeRoomCode(room.code);
              return (
                <Button
                  key={room.id}
                  type="button"
                  variant={isCurrent ? 'secondary' : 'outline'}
                  className="w-full justify-between h-auto py-3 px-4 text-left"
                  onClick={() => onSelectRoom(room)}
                >
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="font-semibold text-slate-900">
                      {room.name}
                    </span>
                    {isCurrent && (
                      <span className="text-xs text-indigo-600 font-medium">
                        Sala atual
                      </span>
                    )}
                  </span>
                  <Badge variant={isCurrent ? 'default' : 'secondary'}>
                    {room.code}
                  </Badge>
                </Button>
              );
            })
          )}
        </div>

        {dismissible && (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
