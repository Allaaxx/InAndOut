import { Badge } from '@client/components/ui/Badge';
import { Button } from '@client/components/ui/Button';
import { Card } from '@client/components/ui/Card';
import { type ColumnDef, DataTable } from '@client/components/ui/DataTable';
import { Input } from '@client/components/ui/Input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@client/components/ui/Sheet';
import { Toaster, toast } from '@client/components/ui/Sonner';
import { useSocket } from '@client/hooks/useSocket';
import { api } from '@client/services/api';
import type { MovementDTO, UserDTO } from '@shared/dtos';
import {
  AlertLevel,
  INCIDENT_OUTCOME_LABELS,
  IncidentOutcome,
  MovementStatus,
} from '@shared/enums';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BellOff,
  Clock,
  LogOut,
  RefreshCw,
  School,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface CoordinationPageProps {
  user: UserDTO;
  token: string;
  onLogout?: () => void;
  onResolveMovement?: (movement: MovementDTO) => void;
  onNavigateToAnalytics?: () => void;
}

export function CoordinationPage({
  user,
  token,
  onLogout,
  onResolveMovement,
  onNavigateToAnalytics,
}: CoordinationPageProps) {
  const [movements, setMovements] = useState<MovementDTO[]>([]);
  const [filterClassCode, setFilterClassCode] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolution Sheet State
  const [selectedMovement, setSelectedMovement] = useState<MovementDTO | null>(
    null,
  );
  const [outcome, setOutcome] = useState<IncidentOutcome>(
    IncidentOutcome.RETURNED_TO_CLASS,
  );
  const [notes, setNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio not supported in environment
    }
  }, [soundEnabled]);

  const loadActiveMovements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCoordinationActiveMovements({}, token);
      setMovements(res.movements);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao carregar saídas ativas para a Coordenação.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadActiveMovements();
  }, [loadActiveMovements]);

  const handleAction = useCallback(
    (movement: MovementDTO) => {
      setSelectedMovement(movement);
      setOutcome(IncidentOutcome.RETURNED_TO_CLASS);
      setNotes('');
      setResolveError(null);
      if (onResolveMovement) {
        onResolveMovement(movement);
      }
    },
    [onResolveMovement],
  );

  const handleConfirmResolution = useCallback(async () => {
    if (!selectedMovement) return;
    try {
      setResolving(true);
      setResolveError(null);
      await api.resolveMovement(
        selectedMovement.id,
        {
          outcome,
          notes: notes.trim() ? notes.trim() : undefined,
        },
        token,
      );
      setMovements((prev) => prev.filter((m) => m.id !== selectedMovement.id));
      const outcomeLabel = INCIDENT_OUTCOME_LABELS[outcome] || outcome;
      toast.success(
        `Ocorrência de ${selectedMovement.studentPublicName} resolvida com sucesso: ${outcomeLabel}`,
      );
      setSelectedMovement(null);
    } catch (err) {
      setResolveError(
        err instanceof Error ? err.message : 'Erro ao resolver ocorrência.',
      );
    } finally {
      setResolving(false);
    }
  }, [selectedMovement, outcome, notes, token]);

  // Real-time socket events for coordination room
  useSocket({
    isCoordination: true,
    enabled: true,
    onMovementExit: (movement) => {
      setMovements((prev) => {
        const exists = prev.some((m) => m.id === movement.id);
        if (exists) {
          return prev.map((m) => (m.id === movement.id ? movement : m));
        }
        return [movement, ...prev];
      });
    },
    onMovementReturn: (movement) => {
      // Returned students are no longer active exits
      setMovements((prev) => prev.filter((m) => m.id !== movement.id));
      setSelectedMovement((current) =>
        current?.id === movement.id ? null : current,
      );
    },
    onMovementOverdue: (movement) => {
      setMovements((prev) =>
        prev.map((m) => (m.id === movement.id ? movement : m)),
      );
    },
    onMovementEscalated: (movement) => {
      setMovements((prev) => {
        const exists = prev.some((m) => m.id === movement.id);
        if (exists) {
          return prev.map((m) => (m.id === movement.id ? movement : m));
        }
        return [movement, ...prev];
      });

      // Visual floating alert via Sonner Toast
      toast.error(
        `Alerta Crítico: Saída escalada de ${movement.studentPublicName} (${movement.classCode})!`,
        {
          description:
            movement.resolutionNotes ||
            'Aluno excedeu o tempo limite e requer intervenção imediata da Coordenação.',
          action: {
            label: 'Atender',
            onClick: () => handleAction(movement),
          },
          duration: 8000,
        },
      );

      // Sound alert if enabled
      playAlertSound();
    },
    onMovementInTransitUnresolved: (movement) => {
      setMovements((prev) =>
        prev.map((m) => (m.id === movement.id ? movement : m)),
      );
    },
    onMovementResolved: (movement) => {
      setMovements((prev) => prev.filter((m) => m.id !== movement.id));
      setSelectedMovement((current) =>
        current?.id === movement.id ? null : current,
      );
    },
  });

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (filterClassCode.trim()) {
        const matchesClass = m.classCode
          .toLowerCase()
          .includes(filterClassCode.trim().toLowerCase());
        if (!matchesClass) return false;
      }
      if (filterStatus !== 'TODOS') {
        if (m.status !== filterStatus) return false;
      }
      return true;
    });
  }, [movements, filterClassCode, filterStatus]);

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
      movements.filter((m) => m.status === MovementStatus.IN_TRANSIT_UNRESOLVED)
        .length,
    [movements],
  );

  const columns: ColumnDef<MovementDTO>[] = useMemo(
    () => [
      {
        key: 'classCode',
        header: 'Turma / Sala',
        render: (item) => (
          <div>
            <span className="font-semibold text-slate-900">
              {item.classCode}
            </span>
            {item.roomId && (
              <span className="block text-xs text-slate-500">
                {item.roomId}
              </span>
            )}
            {item.teacherName && (
              <span className="block text-xs text-slate-500">
                Prof: {item.teacherName}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'student',
        header: 'Estudante',
        render: (item) => (
          <div className="flex items-center gap-2.5">
            <div
              data-testid="student-avatar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
            >
              {(item.studentPublicName || item.studentFullName || 'A').charAt(
                0,
              )}
            </div>
            <div>
              <span className="font-medium text-slate-900">
                {item.studentPublicName ||
                  item.abbreviatedName ||
                  item.studentFullName}
              </span>
              <span className="block text-xs text-slate-500">
                RA: {item.studentRa}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'startedAt',
        header: 'Saída',
        render: (item) => {
          const date = new Date(item.startedAt);
          const timeStr = Number.isNaN(date.getTime())
            ? item.startedAt
            : date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
          return <span className="font-mono text-slate-700">{timeStr}</span>;
        },
      },
      {
        key: 'elapsed',
        header: 'Tempo Decorrido',
        render: (item) => {
          const elapsed = Math.round(item.elapsedMinutes ?? 0);
          const limit = item.allowedLimitMinutes;
          const isOver = elapsed > limit;
          return (
            <div>
              <span
                className={`font-semibold ${
                  isOver ? 'text-red-600' : 'text-slate-800'
                }`}
              >
                {elapsed} min
              </span>
              <span className="block text-xs text-slate-400">
                Limite: {limit} min
              </span>
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
          return <Badge variant="success">Em Trânsito</Badge>;
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
                onClick={() => handleAction(item)}
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
    [handleAction],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Toaster position="top-right" richColors />

      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <School className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Painel da Coordenação
              </h1>
              <p className="text-xs text-slate-500">
                Monitoramento de saídas em tempo real de toda a escola
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Alert Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="flex items-center gap-2"
              title="Configurar Alerta Sonoro"
            >
              {soundEnabled ? (
                <>
                  <Bell className="h-4 w-4 text-emerald-600" />
                  <span>Alerta Sonoro: Ativado</span>
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 text-slate-400" />
                  <span>Alerta Sonoro: Silenciado</span>
                </>
              )}
            </Button>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadActiveMovements}
              disabled={loading}
              title="Atualizar dados"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>

            {/* Analytics Navigation */}
            {onNavigateToAnalytics && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToAnalytics}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                title="Dashboard Geral e Indicadores"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard Geral</span>
              </Button>
            )}

            {/* User Info & Logout */}
            <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {user.role.toLowerCase()}
                </p>
              </div>
              {onLogout && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogout}
                  className="text-slate-600 hover:text-red-600"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Metric Badges & Status summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="flex items-center justify-between p-4 bg-white border-slate-200 shadow-xs">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Saídas Ativas
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {movements.length}
              </p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <Clock className="h-6 w-6" />
            </div>
          </Card>

          <Card className="flex items-center justify-between p-4 bg-white border-slate-200 shadow-xs">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Tempo Excedido
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {overdueCount}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </Card>

          <Card
            className={`flex items-center justify-between p-4 border-slate-200 shadow-xs ${
              escalatedCount > 0 ? 'bg-red-50 border-red-300' : 'bg-white'
            }`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Escalados para Coordenação
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  escalatedCount > 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {escalatedCount}
              </p>
            </div>
            <div
              className={`rounded-lg p-2.5 ${
                escalatedCount > 0
                  ? 'bg-red-100 text-red-600'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>
          </Card>

          <Card
            className={`flex items-center justify-between p-4 border-slate-200 shadow-xs ${
              inTransitCount > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white'
            }`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Saídas em Trânsito
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  inTransitCount > 0 ? 'text-amber-600' : 'text-slate-900'
                }`}
              >
                {inTransitCount}
              </p>
            </div>
            <div
              className={`rounded-lg p-2.5 ${
                inTransitCount > 0
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <RefreshCw className="h-6 w-6" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:max-w-xs">
              <Input
                placeholder="Filtrar por turma..."
                value={filterClassCode}
                onChange={(e) => setFilterClassCode(e.target.value)}
              />
            </div>

            <div className="w-full sm:max-w-xs">
              <select
                aria-label="Filtrar por status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="TODOS">Todos os Status</option>
                <option value={MovementStatus.IN_TRANSIT}>Em Trânsito</option>
                <option value={MovementStatus.OVERDUE}>Tempo Excedido</option>
                <option value={MovementStatus.ESCALATED_TO_COORDINATION}>
                  Escalado para Coordenação
                </option>
                <option value={MovementStatus.IN_TRANSIT_UNRESOLVED}>
                  Saída em Trânsito (Sessão Encerrada)
                </option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Exibindo {filteredMovements.length} de {movements.length} saídas
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Real-time DataTable */}
        <DataTable
          columns={columns}
          data={filteredMovements}
          rowKey={(m) => m.id}
          emptyMessage="Nenhuma saída ativa registrada no momento."
          rowClassName={(m) =>
            m.status === MovementStatus.ESCALATED_TO_COORDINATION
              ? 'bg-red-50 hover:bg-red-100 font-medium border-l-4 border-l-red-600'
              : m.status === MovementStatus.OVERDUE
                ? 'bg-amber-50 hover:bg-amber-100'
                : ''
          }
        />

        {/* Resolution Drawer */}
        <Sheet
          open={!!selectedMovement}
          onOpenChange={(open) => !open && setSelectedMovement(null)}
        >
          {selectedMovement && (
            <SheetContent>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>Resolver Ocorrência</SheetTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMovement(null)}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <SheetDescription className="text-xs text-slate-500">
                  Registre o desfecho formal para a saída do estudante sob
                  tutela da Coordenação.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {/* Student info summary */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div
                      data-testid="coordination-student-avatar"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-base font-bold text-indigo-700 border border-indigo-200"
                    >
                      {(
                        selectedMovement.studentPublicName ||
                        selectedMovement.studentFullName ||
                        'A'
                      ).charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-slate-900 text-base">
                          {selectedMovement.studentPublicName ||
                            selectedMovement.abbreviatedName ||
                            selectedMovement.studentFullName}
                        </h4>
                        <div>
                          {selectedMovement.status ===
                            MovementStatus.ESCALATED_TO_COORDINATION && (
                            <Badge variant="destructive">Escalado</Badge>
                          )}
                          {selectedMovement.status ===
                            MovementStatus.IN_TRANSIT_UNRESOLVED && (
                            <Badge variant="warning">Em Trânsito</Badge>
                          )}
                          {selectedMovement.status ===
                            MovementStatus.OVERDUE && (
                            <Badge variant="warning">Tempo Excedido</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        RA:{' '}
                        <span className="font-mono font-medium">
                          {selectedMovement.studentRa}
                        </span>
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-200 pt-2">
                        <div>
                          <span className="text-slate-400">
                            Turma / Sala de Origem:
                          </span>
                          <p className="font-medium text-slate-800">
                            {selectedMovement.classCode}{' '}
                            {selectedMovement.roomId
                              ? `(${selectedMovement.roomId})`
                              : ''}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Professor(a):</span>
                          <p className="font-medium text-slate-800">
                            {selectedMovement.teacherName ||
                              selectedMovement.authorizedByTeacherId ||
                              'Não informado'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600 border-t border-slate-200 pt-2">
                    <span>
                      Tempo decorrido:{' '}
                      <strong className="text-slate-900">
                        {Math.round(selectedMovement.elapsedMinutes ?? 0)} min
                      </strong>
                    </span>
                    <span>
                      Limite: {selectedMovement.allowedLimitMinutes} min
                    </span>
                  </div>
                </div>

                {/* Resolution Form */}
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="incident-outcome-select"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Desfecho
                    </label>
                    <select
                      id="incident-outcome-select"
                      aria-label="Desfecho"
                      value={outcome}
                      onChange={(e) =>
                        setOutcome(e.target.value as IncidentOutcome)
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value={IncidentOutcome.RETURNED_TO_CLASS}>
                        {
                          INCIDENT_OUTCOME_LABELS[
                            IncidentOutcome.RETURNED_TO_CLASS
                          ]
                        }
                      </option>
                      <option value={IncidentOutcome.ATTENDED_AT_COORDINATION}>
                        {
                          INCIDENT_OUTCOME_LABELS[
                            IncidentOutcome.ATTENDED_AT_COORDINATION
                          ]
                        }
                      </option>
                      <option value={IncidentOutcome.SENT_TO_INFIRMARY}>
                        {
                          INCIDENT_OUTCOME_LABELS[
                            IncidentOutcome.SENT_TO_INFIRMARY
                          ]
                        }
                      </option>
                      <option value={IncidentOutcome.EVASION}>
                        {INCIDENT_OUTCOME_LABELS[IncidentOutcome.EVASION]}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="incident-notes-input"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Observações
                    </label>
                    <textarea
                      id="incident-notes-input"
                      aria-label="Observações"
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Descreva detalhes do atendimento, motivo do encaminhamento ou ocorrência..."
                      className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {resolveError && (
                    <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">
                      {resolveError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedMovement(null)}
                      disabled={resolving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleConfirmResolution}
                      disabled={resolving}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {resolving ? 'Salvando...' : 'Confirmar Resolução'}
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          )}
        </Sheet>
      </main>
    </div>
  );
}

export default CoordinationPage;
