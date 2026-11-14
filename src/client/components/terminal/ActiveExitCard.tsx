import React from 'react';
import { MovementDTO } from '@shared/dtos';
import { Badge } from '@client/components/ui/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';

export interface ActiveExitCardProps {
  activeMovements: MovementDTO[];
}

export function ActiveExitCard({ activeMovements }: ActiveExitCardProps) {
  const currentMovement = activeMovements[0] ?? null;

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
          <Badge variant="warning">Em Trânsito</Badge>
        ) : (
          <Badge variant="success">Sala Livre</Badge>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {currentMovement ? (
          <div
            data-testid="active-student-outside"
            className="rounded-xl border border-amber-200 bg-amber-50/80 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Estudante fora da sala
            </p>
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
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-medium text-slate-600">
              Nenhum aluno fora da sala no momento.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
