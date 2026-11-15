import React, { useState } from 'react';
import {
  EmergencyExitRequestDTO,
  GuestExitRequestDTO,
  MovementDTO,
} from '@shared/dtos';
import { Button } from '@client/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import { Input, Label } from '@client/components/ui/Input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/components/ui/AlertDialog';
import { api } from '@client/services/api';

export interface TeacherOverrideControlsProps {
  sessionId: string;
  classCode: string;
  token: string;
  onMovementStarted: (movement: MovementDTO) => void;
}

export function TeacherOverrideControls({
  sessionId,
  token,
  onMovementStarted,
}: TeacherOverrideControlsProps) {
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [emergencyRa, setEmergencyRa] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);

  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [guestRa, setGuestRa] = useState('');
  const [guestFullName, setGuestFullName] = useState('');
  const [guestOriginClass, setGuestOriginClass] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedRa = emergencyRa.trim();
    if (!trimmedRa) {
      setEmergencyError('RA é obrigatório para liberação de emergência.');
      return;
    }
    setEmergencyLoading(true);
    setEmergencyError(null);
    try {
      const payload: EmergencyExitRequestDTO = {
        ra: trimmedRa,
        sessionId,
      };
      if (emergencyReason.trim()) {
        payload.reason = emergencyReason.trim();
      }
      const response = await api.requestEmergencyExit(payload, token);
      onMovementStarted(response.movement);
      const studentName =
        response.movement.studentPublicName ||
        response.movement.abbreviatedName ||
        response.movement.studentFullName;
      setStatusMessage(`Liberação de emergência concedida para ${studentName}`);
      setIsEmergencyOpen(false);
      setEmergencyRa('');
      setEmergencyReason('');
    } catch (err) {
      setEmergencyError(
        err instanceof Error
          ? err.message
          : 'Erro ao autorizar liberação de emergência.'
      );
    } finally {
      setEmergencyLoading(false);
    }
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedRa = guestRa.trim();
    setGuestLoading(true);
    setGuestError(null);
    try {
      const payload: GuestExitRequestDTO = {
        ra: trimmedRa,
        sessionId,
      };
      if (guestFullName.trim()) {
        payload.fullName = guestFullName.trim();
      }
      if (guestOriginClass.trim()) {
        payload.originClassCode = guestOriginClass.trim();
      }
      const response = await api.requestGuestExit(payload, token);
      onMovementStarted(response.movement);
      const studentName =
        response.movement.studentPublicName ||
        response.movement.abbreviatedName ||
        response.movement.studentFullName;
      setStatusMessage(`Autorização avulsa concedida para ${studentName}`);
      setIsGuestOpen(false);
      setGuestRa('');
      setGuestFullName('');
      setGuestOriginClass('');
    } catch (err) {
      setGuestError(
        err instanceof Error
          ? err.message
          : 'Erro ao autorizar aluno avulso.'
      );
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-900">
            Controles de Exceção do Professor
          </CardTitle>
          <CardDescription>
            Ações especiais protegidas para contornar restrições de lotação e
            turma em situações excepcionais ou de emergência.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusMessage && (
            <div
              role="status"
              data-testid="override-status-banner"
              className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
            >
              {statusMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setEmergencyError(null);
                setIsEmergencyOpen(true);
              }}
            >
              Liberação de Emergência
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setGuestError(null);
                setIsGuestOpen(true);
              }}
            >
              Autorização Avulsa
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isEmergencyOpen} onOpenChange={setIsEmergencyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Liberação de Emergência</AlertDialogTitle>
            <AlertDialogDescription>
              Autorize a saída imediata de um estudante em caráter emergencial,
              mesmo com a sala já ocupada. Esta liberação registrará seu ID de
              professor no log de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleEmergencySubmit} className="space-y-4">
            {emergencyError && (
              <div role="alert" className="text-sm font-medium text-red-600">
                {emergencyError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="emergency-ra-input">RA para Emergência</Label>
              <Input
                id="emergency-ra-input"
                value={emergencyRa}
                onChange={(e) => setEmergencyRa(e.target.value)}
                placeholder="Ex: 1002"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergency-reason-input">Motivo (opcional)</Label>
              <Input
                id="emergency-reason-input"
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                placeholder="Ex: Mal-estar súbito, necessidade médica urgente"
              />
            </div>
            <AlertDialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEmergencyOpen(false);
                  setEmergencyError(null);
                }}
                disabled={emergencyLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={emergencyLoading}
              >
                {emergencyLoading ? 'Autorizando...' : 'Confirmar Emergência'}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isGuestOpen} onOpenChange={setIsGuestOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Autorização Avulsa</AlertDialogTitle>
            <AlertDialogDescription>
              Autorize a saída de um aluno não matriculado nesta turma específica
              (visitante, ouvinte ou transferido recente) com seu aval de
              professor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleGuestSubmit} className="space-y-4">
            {guestError && (
              <div role="alert" className="text-sm font-medium text-red-600">
                {guestError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="guest-ra-input">RA do Aluno Avulso</Label>
              <Input
                id="guest-ra-input"
                value={guestRa}
                onChange={(e) => setGuestRa(e.target.value)}
                placeholder="Ex: 2001"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-name-input">Nome Completo (opcional)</Label>
              <Input
                id="guest-name-input"
                value={guestFullName}
                onChange={(e) => setGuestFullName(e.target.value)}
                placeholder="Ex: Pedro Alves"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-origin-input">
                Turma de Origem (opcional)
              </Label>
              <Input
                id="guest-origin-input"
                value={guestOriginClass}
                onChange={(e) => setGuestOriginClass(e.target.value)}
                placeholder="Ex: 2B"
              />
            </div>
            <AlertDialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsGuestOpen(false);
                  setGuestError(null);
                }}
                disabled={guestLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={guestLoading}>
                {guestLoading ? 'Autorizando...' : 'Confirmar Autorização'}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
