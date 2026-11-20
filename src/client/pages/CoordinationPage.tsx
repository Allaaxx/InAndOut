import { DashboardShell } from '@client/components/coordination/DashboardShell';
import { Toaster, toast } from '@client/components/ui/Sonner';
import { useSocket } from '@client/hooks/useSocket';
import { api } from '@client/services/api';
import type { MovementDTO, UserDTO } from '@shared/dtos';
import { INCIDENT_OUTCOME_LABELS, IncidentOutcome } from '@shared/enums';
import { useCallback, useEffect, useState } from 'react';
import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useInRouterContext,
} from 'react-router-dom';
import { CoordinationAnalyticsPage } from './coordination/CoordinationAnalyticsPage';
import { CoordinationLivePage } from './coordination/CoordinationLivePage';
import { CoordinationRoomsPage } from './coordination/CoordinationRoomsPage';
import { CoordinationSettingsPage } from './coordination/CoordinationSettingsPage';
import { CoordinationStudentsPage } from './coordination/CoordinationStudentsPage';

export interface CoordinationPageProps {
  user: UserDTO;
  token: string;
  onLogout?: () => void;
  onResolveMovement?: (movement: MovementDTO) => void;
  onNavigateToAnalytics?: () => void;
}

function CoordinationPageContent({
  user,
  token,
  onLogout,
  onResolveMovement,
  onNavigateToAnalytics,
}: CoordinationPageProps) {
  const [movements, setMovements] = useState<MovementDTO[]>([]);
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
      // AudioContext not supported in test or environment
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

  const livePageComponent = (
    <CoordinationLivePage
      movements={movements}
      loading={loading}
      error={error}
      onRefresh={loadActiveMovements}
      onAction={handleAction}
      selectedMovement={selectedMovement}
      outcome={outcome}
      setOutcome={setOutcome}
      notes={notes}
      setNotes={setNotes}
      resolving={resolving}
      resolveError={resolveError}
      onCloseSheet={() => setSelectedMovement(null)}
      onConfirmResolution={handleConfirmResolution}
    />
  );

  return (
    <DashboardShell
      user={user}
      onLogout={onLogout}
      onNavigateToAnalytics={onNavigateToAnalytics}
      soundEnabled={soundEnabled}
      onToggleSound={() => setSoundEnabled((prev) => !prev)}
    >
      <Toaster position="bottom-center" richColors />

      <Routes>
        {/* Relative Subroutes (when under /coordination/*) */}
        <Route index element={livePageComponent} />
        <Route path="live" element={livePageComponent} />
        <Route
          path="analytics"
          element={<CoordinationAnalyticsPage token={token} />}
        />
        <Route
          path="students"
          element={<CoordinationStudentsPage token={token} />}
        />
        <Route path="rooms" element={<CoordinationRoomsPage token={token} />} />
        <Route
          path="settings"
          element={
            <CoordinationSettingsPage
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled((prev) => !prev)}
              onTestSound={playAlertSound}
              onRefreshData={loadActiveMovements}
              loading={loading}
            />
          }
        />

        {/* Absolute Subroutes (when rendered directly without parent route) */}
        <Route path="coordination" element={livePageComponent} />
        <Route path="coordination/live" element={livePageComponent} />
        <Route
          path="coordination/analytics"
          element={<CoordinationAnalyticsPage token={token} />}
        />
        <Route
          path="coordination/students"
          element={<CoordinationStudentsPage token={token} />}
        />
        <Route
          path="coordination/rooms"
          element={<CoordinationRoomsPage token={token} />}
        />
        <Route
          path="coordination/settings"
          element={
            <CoordinationSettingsPage
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled((prev) => !prev)}
              onTestSound={playAlertSound}
              onRefreshData={loadActiveMovements}
              loading={loading}
            />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="live" replace />} />
      </Routes>
    </DashboardShell>
  );
}

export function CoordinationPage(props: CoordinationPageProps) {
  const inRouter = useInRouterContext();
  if (!inRouter) {
    return (
      <MemoryRouter initialEntries={['/coordination/live']}>
        <CoordinationPageContent {...props} />
      </MemoryRouter>
    );
  }
  return <CoordinationPageContent {...props} />;
}
