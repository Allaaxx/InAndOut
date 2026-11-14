import React, { useState } from 'react';
import { MovementDTO } from '@shared/dtos';
import { AlertLevel, MovementStatus } from '@shared/enums';
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

export interface ActiveExitCardProps {
  activeMovements: MovementDTO[];
  sessionId?: string;
  token?: string;
  returnConfirmationMessage?: string | null;
  lastReturnedMovement?: MovementDTO | null;
  onMovementUpdated?: (movement: MovementDTO) => void;
}

interface ActiveMovementItemProps {
  movement: MovementDTO;
  token?: string;
  onMovementUpdated?: (movement: MovementDTO) => void;
}

function ActiveMovementItem({
  movement,
  token,
  onMovementUpdated,
}: ActiveMovementItemProps) {
  const [escalating, setEscalating] = useState(false);
  const [escalateError, setEscalateError] = useState<string | null>(null);

  const alertLevel = React.useMemo(() => {
    if (
      movement.status === MovementStatus.ESCALATED_TO_COORDINATION ||
      movement.status === MovementStatus.OVERDUE ||
      movement.alertLevel === AlertLevel.RED
    ) {
      return AlertLevel.RED;
    }
    if (movement.alertLevel === AlertLevel.YELLOW) {
      return AlertLevel.YELLOW;
    }
    if (
      movement.elapsedMinutes !== undefined &&
      movement.allowedLimitMinutes > 0
    ) {
      const ratio = movement.elapsedMinutes / movement.allowedLimitMinutes;
      if (ratio > 1.0) return AlertLevel.RED;
      if (ratio >= 0.8) return AlertLevel.YELLOW;
    }
    return AlertLevel.GREEN;
  }, [movement]);

  const isOverdue =
    movement.status === MovementStatus.OVERDUE || alertLevel === AlertLevel.RED;

  const isEscalated =
    movement.status === MovementStatus.ESCALATED_TO_COORDINATION;

  const handleEscalate = async () => {
    setEscalating(true);
    setEscalateError(null);
    try {
      const response = await api.escalateMovement(
        movement.id,
        {
          notes: 'Professor acionou escalonamento para Coordenação.',
        },
        token
      );
      if (onMovementUpdated) {
        onMovementUpdated(response.movement);
      }
    } catch (err) {
      setEscalateError(
        err instanceof Error
          ? err.message
          : 'Erro ao escalar saída para a Coordenação.'
      );
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div
      data-testid="active-student-outside"
      className={`rounded-xl border p-5 transition-colors ${
        isEscalated
          ? 'border-red-400 bg-red-100/90 text-red-950'
          : isOverdue
            ? 'border-red-300 bg-red-50/90 text-red-950'
            : alertLevel === AlertLevel.YELLOW
              ? 'border-amber-300 bg-amber-50/90 text-amber-950'
              : 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={`text-xs font-semibold uppercase tracking-wider ${
            isEscalated
              ? 'text-red-900'
              : isOverdue
                ? 'text-red-800'
                : alertLevel === AlertLevel.YELLOW
                  ? 'text-amber-800'
                  : 'text-emerald-800'
          }`}
        >
          {isEscalated
            ? 'Escalado para Coordenação Pedagógica'
            : isOverdue
              ? 'Alerta: Tempo limite esgotado (> 100%)'
              : alertLevel === AlertLevel.YELLOW
                ? 'Atenção: Limite de tempo próximo (≥ 80%)'
                : 'Estudante fora da sala'}
        </p>
        <div className="flex items-center gap-2">
          {movement.isEmergency && (
            <Badge
              variant="destructive"
              data-testid="emergency-exit-badge"
              className="font-medium"
            >
              Emergência
            </Badge>
          )}
          {movement.isGuest && (
            <Badge
              variant="outline"
              data-testid="guest-exit-badge"
              className="border-indigo-400 bg-indigo-50 text-indigo-900 font-medium"
            >
              Avulso ({movement.classCode})
            </Badge>
          )}
          {movement.allowedLimitMinutes > 10 && (
            <Badge
              variant="outline"
              data-testid="tempo-especial-badge"
              className="border-blue-400 bg-blue-50 text-blue-900 font-medium"
            >
              Tempo Especial: {movement.allowedLimitMinutes} min
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-2xl font-bold text-slate-900">
          {movement.abbreviatedName ?? movement.studentPublicName}
        </span>
        <Badge variant="outline">
          Saída às{' '}
          {new Date(movement.startedAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Badge>
      </div>

      {isOverdue && !isEscalated && (
        <div
          role="alert"
          data-testid="overdue-warning-banner"
          className="mt-4 rounded-lg border border-red-200 bg-white/80 p-3 text-sm text-red-900 shadow-2xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold">Tempo Limite de Saída Excedido</p>
              <p className="text-xs text-red-700">
                Janela de tolerância de 2 minutos para ação do professor antes
                do escalonamento automático via WebSocket.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              data-testid="escalate-movement-button"
              disabled={escalating}
              onClick={handleEscalate}
              className="shrink-0"
            >
              {escalating ? 'Escalando...' : 'Escalar para Coordenação'}
            </Button>
          </div>
        </div>
      )}

      {isEscalated && (
        <div
          role="alert"
          data-testid="escalated-warning-banner"
          className="mt-4 rounded-lg border border-red-300 bg-white/80 p-3 text-sm text-red-900 shadow-2xs"
        >
          <p className="font-semibold">
            Saída escalada para a Coordenação Pedagógica
          </p>
          <p className="text-xs text-red-700">
            {movement.escalationType === 'AUTOMATIC'
              ? 'Escalonamento automático disparado após encerramento da janela de 2 minutos.'
              : 'Escalonamento manual acionado pelo professor em sala de aula.'}
          </p>
        </div>
      )}

      {escalateError && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {escalateError}
        </p>
      )}
    </div>
  );
}

export function ActiveExitCard({
  activeMovements,
  token,
  returnConfirmationMessage = null,
  lastReturnedMovement = null,
  onMovementUpdated,
}: ActiveExitCardProps) {
  const hasActive = activeMovements.length > 0;

  const headerStatusBadge = React.useMemo(() => {
    if (!hasActive) {
      return <Badge variant="success">Sala Livre</Badge>;
    }

    const anyEscalated = activeMovements.some(
      (m) => m.status === MovementStatus.ESCALATED_TO_COORDINATION
    );
    if (anyEscalated) {
      return (
        <Badge variant="destructive" data-testid="status-badge-escalated">
          Escalado para Coordenação
        </Badge>
      );
    }

    const anyOverdue = activeMovements.some(
      (m) =>
        m.status === MovementStatus.OVERDUE ||
        m.alertLevel === AlertLevel.RED ||
        (m.elapsedMinutes !== undefined &&
          m.allowedLimitMinutes > 0 &&
          m.elapsedMinutes / m.allowedLimitMinutes > 1.0)
    );
    if (anyOverdue) {
      return (
        <Badge variant="destructive" data-testid="status-badge-overdue">
          Tempo Esgotado
        </Badge>
      );
    }

    const anyWarning = activeMovements.some(
      (m) =>
        m.alertLevel === AlertLevel.YELLOW ||
        (m.elapsedMinutes !== undefined &&
          m.allowedLimitMinutes > 0 &&
          m.elapsedMinutes / m.allowedLimitMinutes >= 0.8)
    );
    if (anyWarning) {
      return (
        <Badge variant="warning" data-testid="status-badge-warning">
          Atenção (80%)
        </Badge>
      );
    }

    return (
      <Badge variant="success" data-testid="status-badge-normal">
        {activeMovements.length > 1
          ? `${activeMovements.length} Em Trânsito`
          : 'Em Trânsito'}
      </Badge>
    );
  }, [activeMovements, hasActive]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Status de Ocupação da Sala</CardTitle>
          <CardDescription>
            Exibição pública em conformidade com a LGPD (apenas nome abreviado).
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {activeMovements.length > 1 && (
            <Badge variant="outline" className="text-xs">
              {activeMovements.length} Alunos Fora
            </Badge>
          )}
          {headerStatusBadge}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {hasActive ? (
          <div className="space-y-4">
            {activeMovements.map((movement) => (
              <ActiveMovementItem
                key={movement.id}
                movement={movement}
                token={token}
                onMovementUpdated={onMovementUpdated}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-medium text-slate-600">
              Nenhum aluno fora da sala no momento.
            </p>
          </div>
        )}

        {returnConfirmationMessage && (
          <div
            role="status"
            data-testid="return-confirmation-banner"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
          >
            <p className="font-semibold">{returnConfirmationMessage}</p>
            {lastReturnedMovement && (
              <p className="mt-1 text-emerald-800">
                {lastReturnedMovement.abbreviatedName ??
                  lastReturnedMovement.studentPublicName}
                {lastReturnedMovement.durationMinutes !== undefined
                  ? ` • Ausência: ${lastReturnedMovement.durationMinutes} min`
                  : ''}
                {lastReturnedMovement.attendancePercentage !== undefined
                  ? ` • Presença efetiva: ${lastReturnedMovement.attendancePercentage}%`
                  : ''}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
