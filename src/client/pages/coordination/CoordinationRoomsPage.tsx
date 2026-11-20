import { Badge } from '@client/components/ui/Badge';
import { Button } from '@client/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/Dialog';
import { Input } from '@client/components/ui/Input';
import { Label } from '@client/components/ui/Label';
import { toast } from '@client/components/ui/Sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/Table';
import { api } from '@client/services/api';
import type { RoomDTO } from '@shared/dtos';
import { DoorOpen, Plus, Power, RefreshCw } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

export interface CoordinationRoomsPageProps {
  token: string;
}

export function CoordinationRoomsPage({ token }: CoordinationRoomsPageProps) {
  const [rooms, setRooms] = useState<RoomDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingRoomId, setTogglingRoomId] = useState<string | null>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.listRooms(token);
      setRooms(res.rooms);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao carregar o catálogo de salas de aula.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleOpenCreateDialog = () => {
    setRoomCode('');
    setRoomName('');
    setCreateError(null);
    setIsCreateDialogOpen(true);
  };

  const handleCreateRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedCode = roomCode.trim();
    const trimmedName = roomName.trim();

    if (!trimmedCode || !trimmedName) {
      setCreateError('Informe o código e o nome da sala.');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      const res = await api.createRoom(
        { code: trimmedCode, name: trimmedName },
        token,
      );
      setRooms((prev) =>
        [...prev, res.room].sort((a, b) => a.code.localeCompare(b.code)),
      );
      setIsCreateDialogOpen(false);
      toast.success(`Sala ${res.room.code} cadastrada com sucesso.`);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Erro ao cadastrar sala de aula.',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (room: RoomDTO) => {
    try {
      setTogglingRoomId(room.id);
      setError(null);
      const res = await api.updateRoomStatus(
        room.id,
        { isActive: !room.isActive },
        token,
      );
      setRooms((prev) =>
        prev.map((item) => (item.id === room.id ? res.room : item)),
      );
      toast.success(
        res.room.isActive
          ? `Sala ${res.room.code} ativada com sucesso.`
          : `Sala ${res.room.code} desativada com sucesso.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar o status da sala.',
      );
    } finally {
      setTogglingRoomId(null);
    }
  };

  const activeCount = rooms.filter((r) => r.isActive).length;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <DoorOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Catálogo de Salas de Aula
            </h2>
            <p className="text-sm text-slate-500">
              Cadastre novas salas físicas e controle quais ambientes estão
              ativos para os terminais
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadRooms}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreateDialog}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Sala</span>
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <Card className="bg-white shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Salas Cadastradas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {activeCount} de {rooms.length} salas ativas
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading && rooms.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Carregando salas de aula...
            </p>
          ) : rooms.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nenhuma sala de aula cadastrada até o momento.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome da Sala</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-mono font-semibold text-slate-900">
                      {room.code}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {room.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={room.isActive ? 'success' : 'secondary'}>
                        {room.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={togglingRoomId === room.id}
                        onClick={() => handleToggleStatus(room)}
                        className="inline-flex items-center gap-1.5"
                      >
                        <Power className="h-3.5 w-3.5" />
                        <span>{room.isActive ? 'Desativar' : 'Ativar'}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Sala de Aula</DialogTitle>
            <DialogDescription>
              Informe o código identificador único e o nome amigável da sala
              física.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-code-input">Código da Sala</Label>
              <Input
                id="room-code-input"
                placeholder="Ex.: SALA-04 ou LAB-02"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                disabled={creating}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-name-input">Nome da Sala</Label>
              <Input
                id="room-name-input"
                placeholder="Ex.: Sala 04 ou Laboratório de Química"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                disabled={creating}
                required
              />
            </div>

            {createError && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {createError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Cadastrando...' : 'Cadastrar Sala'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
