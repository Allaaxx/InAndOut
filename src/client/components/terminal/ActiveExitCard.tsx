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

export function ActiveExitCard({
  activeMovements,
  token,
  returnConfirmationMessage = null,
  lastReturnedMovement = null,
  onMovementUpdated,
}: ActiveExitCardProps) {
  const currentMovement = activeMovements[0] ?? null;
  const [escalating, setEscalating] = useState(false);
  const [escalateError, setEscalateError] = useState<string | null>(null);

  const alertLevel = React.useMemo(() => {
    if (!currentMovement) return null;
    if (
      currentMovement.status === MovementStatus.ESCALATED_TO_COORDINATION ||
      currentMovement.status === MovementStatus.OVERDUE ||
      currentMovement.alertLevel === AlertLevel.RED
    ) {
      return AlertLevel.RED;
    }
    if (currentMovement.alertLevel === AlertLevel.YELLOW) {
      return AlertLevel.YELLOW;
    }
    if (
      currentMovement.elapsedMinutes !== undefined &&
      currentMovement.allowedLimitMinutes > 0
    ) {
      const ratio =
        currentMovement.elapsedMinutes / currentMovement.allowedLimitMinutes;
      if (ratio > 1.0) return AlertLevel.RED;
      if (ratio >= 0.8) return AlertLevel.YELLOW;
    }
    return AlertLevel.GREEN;
  }, [currentMovement]);

  const isOverdue =
    currentMovement?.status === MovementStatus.OVERDUE ||
    alertLevel === AlertLevel.RED;

  const isEscalated =
    currentMovement?.status === MovementStatus.ESCALATED_TO_COORDINATION;

  const handleEscalate = async () => {
    if (!currentMovement) return;
    setEscalating(true);
    setEscalateError(null);
    try {
      const response = await api.escalateMovement(
        currentMovement.id,
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Status de Ocupação da Sala</CardTitle>
          <CardDescription>
            Exibição pública em conformidade com a LGPD (apenas nome abreviado).
          </CardDescription>
        </div>
        {currentMovement ? (
          isEscalated ? (
            <Badge
              variant="destructive"
              data-testid="status-badge-escalated"
            >
              Escalado para Coordenação
            </Badge>
          ) : isOverdue ? (
            <Badge
              variant="destructive"
              data-testid="status-badge-overdue"
            >
              Tempo Esgotado
            </Badge>
          ) : alertLevel === AlertLevel.YELLOW ? (
            <Badge
              variant="warning"
              data-testid="status-badge-warning"
            >
              Atenção (80%)
            </Badge>
          ) : (
            <Badge
              variant="success"
              data-testid="status-badge-normal"
            >
              Em Trânsito
            </Badge>
          )
        ) : (
          <Badge variant="success">Sala Livre</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {currentMovement ? (
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
            <div className="flex items-center justify-between">
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
              {currentMovement.allowedLimitMinutes > 10 && (
                <Badge
                  variant="outline"
                  data-testid="tempo-especial-badge"
                  className="border-blue-400 bg-blue-50 text-blue-900 font-medium"
                >
                  Tempo Especial: {currentMovement.allowedLimitMinutes} min
                </Badge>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900">
                {currentMovement.abbreviatedName ??
                  currentMovement.studentPublicName}
              </span>
              <Badge variant="outline">
                Saída às{' '}
                {new Date(currentMovement.startedAt).toLocaleTimeString(
                  'pt-BR',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )}
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
                    <p className="font-semibold">
                      Tempo Limite de Saída Excedido
                    </p>
                    <p className="text-xs text-red-700">
                      Janela de tolerância de 2 minutos para ação do professor
                      antes do escalonamento automático via WebSocket.
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
                    {escalating
                      ? 'Escalando...'
                      : 'Escalar para Coordenação'}
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
                  {currentMovement.escalationType === 'AUTOMATIC'
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
