import { Badge } from '@client/components/ui/Badge';
import { Button } from '@client/components/ui/Button';
import { Card } from '@client/components/ui/Card';
import { type ColumnDef, DataTable } from '@client/components/ui/DataTable';
import { Label } from '@client/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/Select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@client/components/ui/Sheet';
import { Textarea } from '@client/components/ui/Textarea';
import type { ActiveRoomSessionSummaryDTO, MovementDTO } from '@shared/dtos';
import {
  AlertLevel,
  INCIDENT_OUTCOME_LABELS,
  IncidentOutcome,
  MovementStatus,
} from '@shared/enums';
import { formatTimeInAppTimezone } from '@shared/timezone';
import {
  AlertTriangle,
  Clock,
  DoorOpen,
  Filter,
  ShieldAlert,
  UserCheck,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';

export interface CoordinationLivePageProps {
  movements: MovementDTO[];
  activeRooms?: ActiveRoomSessionSummaryDTO[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAction: (movement: MovementDTO) => void;
  selectedMovement: MovementDTO | null;
  outcome: IncidentOutcome;
  setOutcome: (outcome: IncidentOutcome) => void;
  notes: string;
  setNotes: (notes: string) => void;
  resolving: boolean;
  resolveError: string | null;
  onCloseSheet: () => void;
  onConfirmResolution: () => void;
}

export function CoordinationLivePage({
  movements,
  activeRooms = [],
  loading,
  error,
  onRefresh: _onRefresh,
  onAction,
  selectedMovement,
  outcome,
  setOutcome,
  notes,
  setNotes,
  resolving,
  resolveError,
  onCloseSheet,
  onConfirmResolution,
}: CoordinationLivePageProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>('TODAS');
  const [selectedClassCode, setSelectedClassCode] = useState<string>('TODOS');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');

  const roomOptions = useMemo(() => {
    const roomsMap = new Map<string, string>();
    for (const room of activeRooms) {
      roomsMap.set(room.roomId, room.roomName);
    }
    for (const movement of movements) {
      if (movement.roomId && !roomsMap.has(movement.roomId)) {
        roomsMap.set(movement.roomId, movement.roomId);
      }
    }
    return Array.from(roomsMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [activeRooms, movements]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (selectedRoomId !== 'TODAS' && m.roomId !== selectedRoomId) {
        return false;
      }
      if (selectedClassCode !== 'TODOS' && m.classCode !== selectedClassCode) {
        return false;
      }
      if (filterStatus !== 'TODOS') {
        if (m.status !== filterStatus) return false;
      }
      return true;
    });
  }, [movements, selectedRoomId, selectedClassCode, filterStatus]);

  const escalatedCount = useMemo(
    () =>
      movements.filter(
        (m) => m.status === MovementStatus.ESCALATED_TO_COORDINATION,
      ).length,
    [movements],
  );

  const overdueCount = useMemo(
    () => movements.filter((m) => m.status === MovementStatus.OVERDUE).length,
    [movements],
  );

  const inTransitCount = useMemo(
    () =>
      movements.filter(
        (m) =>
          m.status === MovementStatus.IN_TRANSIT_UNRESOLVED ||
          m.status === MovementStatus.IN_TRANSIT,
      ).length,
    [movements],
  );

  const columns: ColumnDef<MovementDTO>[] = useMemo(
    () => [
      {
        key: 'student',
        header: 'Aluno / RA',
        render: (item) => (
          <div className="flex items-center gap-3">
            <div
              data-testid="student-avatar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-600 border border-slate-200"
              title={item.studentFullName || item.studentPublicName}
            >
              {(item.studentPublicName || 'AL')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <p className="font-semibold text-slate-900 leading-snug">
                {item.studentPublicName}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                RA: {item.studentRa}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'roomId',
        header: 'Sala',
        render: (item) => (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 font-mono">
            {item.roomId || 'Não informada'}
          </span>
        ),
      },
      {
        key: 'classCode',
        header: 'Turma',
        render: (item) => (
          <div>
            <span className="font-semibold text-slate-900">
              {item.classCode}
            </span>
            {item.teacherName ? (
              <span className="block text-xs text-slate-500">
                Prof: {item.teacherName}
              </span>
            ) : item.authorizedByTeacherId ? (
              <span className="block text-xs text-slate-500">
                Prof: {item.authorizedByTeacherId}
              </span>
            ) : (
              <span className="block text-xs text-slate-400">
                Prof: Não informado
              </span>
            )}
            {item.subject && (
              <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                {item.subject}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'duration',
        header: 'Tempo Fora / Limite',
        render: (item) => {
          const isOverdue =
            item.status === MovementStatus.OVERDUE ||
            item.status === MovementStatus.ESCALATED_TO_COORDINATION;
          return (
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-sm">
                <Clock
                  className={`h-4 w-4 ${
                    isOverdue ? 'text-rose-500' : 'text-slate-400'
                  }`}
                />
                <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                  {item.elapsedMinutes ?? 0} min
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Limite: {item.allowedLimitMinutes} min
              </p>
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (item) => {
          if (item.status === MovementStatus.ESCALATED_TO_COORDINATION) {
            return (
              <Badge variant="destructive" className="animate-pulse">
                Escalado para Coordenação
              </Badge>
            );
          }
          if (item.status === MovementStatus.OVERDUE) {
            return <Badge variant="warning">Tempo Excedido</Badge>;
          }
          if (item.status === MovementStatus.IN_TRANSIT_UNRESOLVED) {
            return (
              <Badge variant="warning">
                Saída em Trânsito (Sessão Encerrada)
              </Badge>
            );
          }
          if (item.alertLevel === AlertLevel.YELLOW) {
            return <Badge variant="warning">Atenção (80%)</Badge>;
          }
          return <Badge variant="outline">Saída em Trânsito</Badge>;
        },
      },
      {
        key: 'actions',
        header: 'Ações',
        render: (item) => {
          const isEscalated =
            item.status === MovementStatus.ESCALATED_TO_COORDINATION;
          const isInTransitUnresolved =
            item.status === MovementStatus.IN_TRANSIT_UNRESOLVED;
          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isEscalated ? 'destructive' : 'outline'}
                onClick={() => onAction(item)}
              >
                {isEscalated
                  ? 'Ação Imediata'
                  : isInTransitUnresolved
                    ? 'Resolver'
                    : 'Detalhes'}
              </Button>
            </div>
          );
        },
      },
    ],
    [onAction],
  );

  return (
    <div className="space-y-6">
      {/* Active Rooms Summary Cards */}
      {activeRooms.length > 0 && (
        <section aria-label="Salas Ativas" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-indigo-600" />
              <span>Salas Ativas</span>
              <Badge variant="outline" className="ml-1 font-mono">
                {activeRooms.length}
              </Badge>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeRooms.map((room) => {
              const isSelected = selectedRoomId === room.roomId;
              const borderClass = room.hasEscalated
                ? 'border-l-4 border-l-rose-600 bg-rose-50/40'
                : room.hasOverdue
                  ? 'border-l-4 border-l-amber-500 bg-amber-50/40'
                  : 'border-l-4 border-l-emerald-500 bg-white';

              return (
                <Card
                  key={room.sessionId}
                  data-testid={`active-room-card-${room.roomId}`}
                  onClick={() =>
                    setSelectedRoomId((prev) =>
                      prev === room.roomId ? 'TODAS' : room.roomId,
                    )
                  }
                  className={`cursor-pointer p-4 shadow-xs transition-all hover:shadow-md ${borderClass} ${
                    isSelected ? 'ring-2 ring-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-slate-900">
                        {room.roomId}
                      </p>
                      {room.roomName && room.roomName !== room.roomId && (
                        <p className="text-xs text-slate-500 truncate">
                          {room.roomName}
                        </p>
                      )}
                    </div>
                    {room.hasEscalated ? (
                      <Badge variant="destructive" className="shrink-0">
                        Alerta Crítico
                      </Badge>
                    ) : room.hasOverdue ? (
                      <Badge variant="warning" className="shrink-0">
                        Tempo Excedido
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        Normal
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p className="font-medium text-slate-800 truncate">
                      {room.teacherName}
                    </p>
                    <p className="text-slate-500 truncate">
                      Turma {room.classCode}
                      {room.subject ? ` • ${room.subject}` : ''}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {room.activeExitCount} fora
                    </span>
                    {isSelected && (
                      <span className="text-[11px] font-medium text-indigo-600">
                        Filtrado
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Saídas em Trânsito
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {inTransitCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-rose-500 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Atrasadas
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {overdueCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-indigo-600 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Críticas / Escaladas
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {escalatedCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Ativas
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {movements.length}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 w-full sm:w-fit">
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger
                  id="room-select"
                  aria-label="Filtrar por Sala"
                  className="h-9 w-full sm:w-fit font-medium text-slate-700"
                >
                  <div className="flex items-center gap-2 truncate">
                    <DoorOpen className="h-4 w-4 shrink-0 text-slate-400" />
                    <SelectValue placeholder="Todas as Salas" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as Salas</SelectItem>
                  {roomOptions.map((room) => (
                    <SelectItem key={room.code} value={room.code}>
                      {room.name !== room.code
                        ? `${room.code} — ${room.name}`
                        : room.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-fit">
              <Select
                value={selectedClassCode}
                onValueChange={setSelectedClassCode}
              >
                <SelectTrigger
                  id="class-select"
                  aria-label="Filtrar por Turma"
                  className="h-9 w-full sm:w-fit font-medium text-slate-700"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="h-4 w-4 shrink-0 text-slate-400" />
                    <SelectValue placeholder="Filtrar por Turma" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas as Turmas</SelectItem>
                  <SelectItem value="1A">Turma 1A</SelectItem>
                  <SelectItem value="2B">Turma 2B</SelectItem>
                  <SelectItem value="3C">Turma 3C</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger
                aria-label="Filtrar por status"
                className="h-9 w-[210px] text-slate-700"
              >
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Status</SelectItem>
                <SelectItem value={MovementStatus.IN_TRANSIT}>
                  Em Trânsito
                </SelectItem>
                <SelectItem value={MovementStatus.OVERDUE}>
                  Atrasadas
                </SelectItem>
                <SelectItem value={MovementStatus.ESCALATED_TO_COORDINATION}>
                  Crítico / Escaladas
                </SelectItem>
                <SelectItem value={MovementStatus.IN_TRANSIT_UNRESOLVED}>
                  Pendente de Resolução
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Active Exits DataTable */}
      <Card className="bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Saídas Ativas em Tempo Real</span>
              {loading && (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Listagem consolidada de todas as salas de aula em atividade
            </p>
          </div>
          {filteredMovements.length > 0 && (
            <span className="text-xs text-slate-400 font-medium">
              {filteredMovements.length} registro(s)
            </span>
          )}
        </div>

        {error && (
          <div className="p-4 bg-rose-50 text-rose-700 text-sm border-b border-rose-100">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={filteredMovements}
            rowKey={(item) => item.id}
            emptyMessage="Nenhuma saída ativa registrada no momento."
            rowClassName={(item) =>
              item.status === MovementStatus.ESCALATED_TO_COORDINATION
                ? 'bg-red-50 hover:bg-red-100 font-medium border-l-4 border-l-red-600'
                : item.status === MovementStatus.OVERDUE
                  ? 'bg-amber-50 hover:bg-amber-100'
                  : ''
            }
          />
        </div>
      </Card>

      {/* Resolution Sheet Drawer */}
      <Sheet
        open={Boolean(selectedMovement)}
        onOpenChange={(open) => !open && onCloseSheet()}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto"
        >
          <SheetHeader className="border-b border-slate-200 pb-4">
            <SheetTitle className="text-lg font-bold text-slate-900">
              Resolver Ocorrência
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              Registrar desfecho e encaminhamento pedagógico/disciplinar
            </SheetDescription>
          </SheetHeader>

          {selectedMovement && (
            <div className="space-y-6 pt-4">
              {/* Student Summary Info */}
              <div className="flex items-center gap-3.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                <div
                  data-testid="coordination-student-avatar"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-sm text-indigo-700 border border-indigo-200"
                >
                  {(
                    selectedMovement.studentPublicName ||
                    selectedMovement.studentFullName ||
                    'A'
                  ).charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 leading-tight">
                    {selectedMovement.studentPublicName ||
                      selectedMovement.abbreviatedName ||
                      selectedMovement.studentFullName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    RA: {selectedMovement.studentRa}
                  </p>
                  <p className="text-xs text-indigo-600 font-medium">
                    Turma {selectedMovement.classCode}
                  </p>
                </div>
              </div>

              {/* Context Information */}
              <div className="space-y-2 rounded-lg border border-slate-200 p-3.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">
                    Turma / Sala de Origem:
                  </span>
                  <span className="font-medium text-slate-800">
                    {selectedMovement.classCode} ({selectedMovement.roomId})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Professor Responsável:</span>
                  <span className="font-medium text-slate-800">
                    {selectedMovement.teacherName ||
                      selectedMovement.authorizedByTeacherId ||
                      'Não informado'}
                  </span>
                </div>
                {selectedMovement.subject && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Disciplina:</span>
                    <span className="font-medium text-slate-800">
                      {selectedMovement.subject}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Tempo Ausente:</span>
                  <span className="font-bold text-rose-600">
                    {selectedMovement.elapsedMinutes ?? 0} min
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Limite Autorizado:</span>
                  <span className="font-medium text-slate-800">
                    {selectedMovement.allowedLimitMinutes} min
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Horário de Saída:</span>
                  <span className="font-medium text-slate-800">
                    {formatTimeInAppTimezone(selectedMovement.startedAt)}
                  </span>
                </div>
                {selectedMovement.escalatedAt && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Escalado em:</span>
                    <span className="font-medium text-rose-600">
                      {formatTimeInAppTimezone(selectedMovement.escalatedAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* Resolution Form */}
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="coordination-outcome-select"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Desfecho / Encaminhamento
                  </Label>
                  <Select
                    value={outcome}
                    onValueChange={(value) =>
                      setOutcome(value as IncidentOutcome)
                    }
                  >
                    <SelectTrigger id="coordination-outcome-select">
                      <SelectValue placeholder="Selecione o desfecho" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={IncidentOutcome.RETURNED_TO_CLASS}>
                        {INCIDENT_OUTCOME_LABELS[
                          IncidentOutcome.RETURNED_TO_CLASS
                        ] || 'Retornou à Sala de Aula'}
                      </SelectItem>
                      <SelectItem value={IncidentOutcome.SENT_TO_INFIRMARY}>
                        {INCIDENT_OUTCOME_LABELS[
                          IncidentOutcome.SENT_TO_INFIRMARY
                        ] || 'Encaminhado à Enfermaria'}
                      </SelectItem>
                      <SelectItem
                        value={IncidentOutcome.ATTENDED_AT_COORDINATION}
                      >
                        {INCIDENT_OUTCOME_LABELS[
                          IncidentOutcome.ATTENDED_AT_COORDINATION
                        ] || 'Atendido na Coordenação'}
                      </SelectItem>
                      <SelectItem value={IncidentOutcome.EVASION}>
                        {INCIDENT_OUTCOME_LABELS[IncidentOutcome.EVASION] ||
                          'Evasão'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="coordination-resolution-notes"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Observações / Parecer da Coordenação
                  </Label>
                  <Textarea
                    id="coordination-resolution-notes"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Descreva as medidas tomadas, contato com responsáveis ou orientações ao aluno..."
                  />
                </div>

                {resolveError && (
                  <div className="rounded-md bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                    {resolveError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCloseSheet}
                    disabled={resolving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onConfirmResolution}
                    disabled={resolving}
                  >
                    {resolving ? 'Salvando...' : 'Confirmar Resolução'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
