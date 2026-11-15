import { CoordinationPage } from '@client/pages/CoordinationPage';
import { api } from '@client/services/api';
import type { MovementDTO, UserDTO } from '@shared/dtos';
import { AlertLevel, MovementStatus, UserRole } from '@shared/enums';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock('@client/services/api', () => ({
  api: {
    getCoordinationActiveMovements: vi.fn(),
    getOverviewAnalytics: vi.fn(),
    getStudentHistory: vi.fn(),
    exportAnalytics: vi.fn(),
    resolveMovement: vi.fn(),
  },
}));

describe('Frontend Seam: Dashboard Shell & Specialized Coordination Routes (Ticket #38)', () => {
  const coordUser: UserDTO = {
    id: 'coord-1',
    name: 'Coord. Mariana Alves',
    email: 'coord@linsdorego.edu.br',
    role: UserRole.COORDINATOR,
  };

  const sampleMovement: MovementDTO = {
    id: 'mov-shell-1',
    sessionId: 'session-101',
    studentId: 'student-1',
    studentRa: '1001',
    studentFullName: 'Lucas Silva',
    studentPublicName: 'Lucas S.',
    abbreviatedName: 'Lucas S.',
    classCode: '1A',
    roomId: 'SALA-01',
    subject: 'Matemática',
    status: MovementStatus.IN_TRANSIT,
    alertLevel: AlertLevel.GREEN,
    startedAt: '2026-03-10T08:00:00.000Z',
    allowedLimitMinutes: 10,
    elapsedMinutes: 4,
    isEmergency: false,
    isGuest: false,
  };

  const mockAnalyticsData = {
    stats: {
      averageOutsideMinutes: 7.5,
      averageAbsentMinutes: 7.5,
      totalExitsToday: 12,
      complianceRate: 85,
      activeIncidentsCount: 1,
      activeIncidents: 1,
    },
    peakHours: [{ hour: 8, label: '08:00', count: 5 }],
    hourlyDistribution: [{ hour: 8, label: '08:00', count: 5 }],
    outcomeDistribution: [
      {
        outcome: 'RETURNED_NORMAL',
        label: 'Retorno normal',
        count: 10,
        percentage: 83.3,
      },
    ],
    outcomesDistribution: [
      {
        outcome: 'RETURNED_NORMAL',
        label: 'Retorno normal',
        count: 10,
        percentage: 83.3,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValue({
      movements: [sampleMovement],
    });
    vi.mocked(api.getOverviewAnalytics).mockResolvedValue(mockAnalyticsData);
  });

  it('renders Dashboard Shell with brand, contextual header, user avatar, and logout button', async () => {
    const user = userEvent.setup();
    const onLogoutMock = vi.fn();

    render(
      <CoordinationPage
        user={coordUser}
        token="valid-coord-jwt"
        onLogout={onLogoutMock}
      />,
    );

    // 1. Sidebar Brand & Navigation
    expect(screen.getByTestId('coordination-sidebar')).toBeInTheDocument();
    expect(screen.getByText('InAndOut')).toBeInTheDocument();
    expect(screen.getByText('Painel da Coordenação')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-school-icon')).toBeInTheDocument();

    // 2. Header Context & Coordinator Info in Profile Dropdown Trigger
    expect(screen.getByTestId('coordination-header')).toBeInTheDocument();
    expect(screen.getByTestId('coordinator-avatar')).toHaveTextContent('MA');
    expect(screen.getByText('Coord. Mariana Alves')).toBeInTheDocument();

    // 3. Open profile dropdown and trigger Logout action
    const profileTrigger = screen.getByTestId(
      'coordinator-profile-dropdown-trigger',
    );
    await user.click(profileTrigger);
    expect(
      screen.getByTestId('coordinator-profile-dropdown'),
    ).toBeInTheDocument();

    const logoutBtn = screen.getByRole('menuitem', { name: /Sair/i });
    await user.click(logoutBtn);
    expect(onLogoutMock).toHaveBeenCalledTimes(1);
  });

  it('toggles sidebar collapse state between expanded and collapsed', async () => {
    const user = userEvent.setup();
    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);

    const collapseToggle = screen.getByTestId('sidebar-collapse-toggle');
    expect(collapseToggle).toHaveAttribute(
      'aria-label',
      'Recolher barra lateral',
    );

    // Collapse sidebar
    expect(screen.getByTestId('sidebar-school-icon')).toBeInTheDocument();
    await user.click(collapseToggle);
    expect(collapseToggle).toHaveAttribute(
      'aria-label',
      'Expandir barra lateral',
    );
    expect(screen.getByTestId('coordination-sidebar')).toHaveClass('w-20');
    expect(screen.queryByTestId('sidebar-school-icon')).not.toBeInTheDocument();

    // Expand sidebar back
    await user.click(collapseToggle);
    expect(screen.getByTestId('sidebar-school-icon')).toBeInTheDocument();
    expect(collapseToggle).toHaveAttribute(
      'aria-label',
      'Recolher barra lateral',
    );
    expect(screen.getByTestId('coordination-sidebar')).toHaveClass('w-64');
  });

  it('navigates seamlessly across the 4 specialized views: Live, Analytics, Students, and Settings', async () => {
    const user = userEvent.setup();
    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);

    // 1. Default view: Monitoramento em Tempo Real (/coordination/live)
    expect(screen.getByTestId('sidebar-nav-live')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      await screen.findByText('Saídas Ativas em Tempo Real'),
    ).toBeInTheDocument();
    expect(screen.getByText('Lucas S.')).toBeInTheDocument();
    expect(screen.getByText('Saídas em Trânsito')).toBeInTheDocument();

    // 2. Navigate to Visão Geral (/coordination/analytics)
    const analyticsNav = screen.getByTestId('sidebar-nav-analytics');
    await user.click(analyticsNav);

    expect(analyticsNav).toHaveAttribute('aria-current', 'page');
    expect(
      await screen.findByText(/Indicadores de Fluxo e Permanência/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tempo Médio Fora de Sala/i)).toBeInTheDocument();
    expect(screen.getByText(/7.5 min/i)).toBeInTheDocument();
    expect(screen.getByText(/Saídas Realizadas Hoje/i)).toBeInTheDocument();
    expect(screen.getByText(/Taxa de Conformidade/i)).toBeInTheDocument();

    // 3. Navigate to Consulta por Aluno (/coordination/students)
    const studentsNav = screen.getByTestId('sidebar-nav-students');
    await user.click(studentsNav);

    expect(studentsNav).toHaveAttribute('aria-current', 'page');
    expect(
      await screen.findByText('Consultar Histórico por Aluno'),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Digite o RA do aluno/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buscar/i })).toBeInTheDocument();

    // 4. Navigate to Configurações (/coordination/settings)
    const settingsNav = screen.getByTestId('sidebar-nav-settings');
    await user.click(settingsNav);

    expect(settingsNav).toHaveAttribute('aria-current', 'page');
    expect(
      await screen.findByText('Preferências da Coordenação'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Alerta Sonoro de Ocorrências Críticas/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Testar Som de Alerta/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Recarregar Dados em Tempo Real/i }),
    ).toBeInTheDocument();

    // Test sound toggle in settings
    const soundToggle = screen.getByRole('button', {
      name: /Alerta Sonoro: Ativado/i,
    });
    await user.click(soundToggle);
    expect(
      screen.getByRole('button', { name: /Alerta Sonoro: Silenciado/i }),
    ).toBeInTheDocument();

    // 5. Navigate back to Monitoramento em Tempo Real
    const liveNav = screen.getByTestId('sidebar-nav-live');
    await user.click(liveNav);

    expect(liveNav).toHaveAttribute('aria-current', 'page');
    expect(
      await screen.findByText('Saídas Ativas em Tempo Real'),
    ).toBeInTheDocument();
  });
});
