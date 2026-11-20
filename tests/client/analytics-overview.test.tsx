import { App } from '@client/App';
import { AnalyticsDashboardPage } from '@client/pages/AnalyticsDashboardPage';
import { api } from '@client/services/api';
import type { SchoolOverviewAnalyticsDTO, UserDTO } from '@shared/dtos';
import { UserRole } from '@shared/enums';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@client/services/api', () => ({
  api: {
    login: vi.fn(),
    verifyPin: vi.fn(),
    refreshToken: vi.fn(),
    getActiveSession: vi.fn(),
    getCoordinationActiveMovements: vi.fn(),
    getOverviewAnalytics: vi.fn(),
  },
}));

describe('Frontend Seam: AnalyticsDashboardPage & Shadcn Recharts Visualizations', () => {
  const coordinatorUser: UserDTO = {
    id: 'coord-1',
    name: 'Coord. Mariana Alves',
    email: 'coord@linsdorego.edu.br',
    role: UserRole.COORDINATOR,
  };

  const mockAnalyticsData: SchoolOverviewAnalyticsDTO = {
    stats: {
      averageOutsideMinutes: 8.4,
      averageAbsentMinutes: 8.4,
      totalExitsToday: 15,
      complianceRate: 86.7,
      activeIncidentsCount: 2,
      activeIncidents: 2,
    },
    hourlyDistribution: [
      { hour: 7, label: '07:00', count: 1 },
      { hour: 8, label: '08:00', count: 6 },
      { hour: 9, label: '09:00', count: 4 },
      { hour: 10, label: '10:00', count: 3 },
      { hour: 11, label: '11:00', count: 1 },
    ],
    peakHours: [
      { hour: 7, label: '07:00', count: 1 },
      { hour: 8, label: '08:00', count: 6 },
      { hour: 9, label: '09:00', count: 4 },
      { hour: 10, label: '10:00', count: 3 },
      { hour: 11, label: '11:00', count: 1 },
    ],
    outcomeDistribution: [
      {
        outcome: 'RETURNED_NORMAL',
        label: 'Retorno normal',
        count: 12,
        percentage: 80,
      },
      {
        outcome: 'SENT_TO_INFIRMARY',
        label: 'Enfermaria',
        count: 1,
        percentage: 6.7,
      },
      {
        outcome: 'ATTENDED_AT_COORDINATION',
        label: 'Atendimento na Coordenação',
        count: 1,
        percentage: 6.7,
      },
      { outcome: 'EVASION', label: 'Evasão', count: 1, percentage: 6.7 },
    ],
    outcomesDistribution: [
      {
        outcome: 'RETURNED_NORMAL',
        label: 'Retorno normal',
        count: 12,
        percentage: 80,
      },
      {
        outcome: 'SENT_TO_INFIRMARY',
        label: 'Enfermaria',
        count: 1,
        percentage: 6.7,
      },
      {
        outcome: 'ATTENDED_AT_COORDINATION',
        label: 'Atendimento na Coordenação',
        count: 1,
        percentage: 6.7,
      },
      { outcome: 'EVASION', label: 'Evasão', count: 1, percentage: 6.7 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders stat cards with average time, exits today, compliance rate, and active incidents', async () => {
    vi.mocked(api.getOverviewAnalytics).mockResolvedValueOnce(
      mockAnalyticsData,
    );

    render(
      <AnalyticsDashboardPage user={coordinatorUser} token="test-token" />,
    );

    expect(screen.getByText(/Carregando indicadores/i)).toBeInTheDocument();

    // Verify Stat Cards appear with mock data
    expect(await screen.findByText('8.4 min')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('86.7%')).toBeInTheDocument();
    const activeCard = screen
      .getByText(/Ocorrências Ativas/i)
      .closest('.shadow-xs');
    expect(activeCard).toHaveTextContent('2');

    // Verify card titles/descriptions
    expect(screen.getByText(/Tempo Médio Fora de Sala/i)).toBeInTheDocument();
    expect(screen.getByText(/Total de Saídas no Dia/i)).toBeInTheDocument();
    expect(screen.getByText(/Taxa de Conformidade/i)).toBeInTheDocument();
    expect(screen.getByText(/Ocorrências Ativas/i)).toBeInTheDocument();
  });

  it('renders peak hours bar chart and outcomes pie chart', async () => {
    vi.mocked(api.getOverviewAnalytics).mockResolvedValueOnce(
      mockAnalyticsData,
    );

    render(
      <AnalyticsDashboardPage user={coordinatorUser} token="test-token" />,
    );

    // Wait for data load
    expect(await screen.findByText(/Horários de Pico/i)).toBeInTheDocument();
    expect(screen.getByText(/Desfechos de Ocorrência/i)).toBeInTheDocument();

    // Check that outcome labels are rendered in the distribution legend
    expect(screen.getByText(/Retorno normal/i)).toBeInTheDocument();
    expect(screen.getByText(/Enfermaria/i)).toBeInTheDocument();
    expect(screen.getByText(/Atendimento na Coordenação/i)).toBeInTheDocument();
    expect(screen.getByText(/Evasão/i)).toBeInTheDocument();
  });

  it('filters analytics when changing classCode or date filter', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getOverviewAnalytics).mockResolvedValue(mockAnalyticsData);

    render(
      <AnalyticsDashboardPage user={coordinatorUser} token="test-token" />,
    );

    await screen.findByText(/Tempo Médio Fora de Sala/i);

    // Select classCode filter
    const classSelect = screen.getByLabelText(/Filtrar por Turma/i);
    await user.click(classSelect);
    await user.click(await screen.findByRole('option', { name: 'Turma 1A' }));

    await waitFor(() => {
      expect(api.getOverviewAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ classCode: '1A' }),
        'test-token',
      );
    });
  });

  it('allows navigation from App to Analytics Dashboard for coordinator/admin users', async () => {
    const user = userEvent.setup();

    vi.mocked(api.login).mockResolvedValueOnce({
      token: 'jwt-coord-token',
      refreshToken: 'jwt-refresh-token',
      user: coordinatorUser,
    });
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValue({
      movements: [],
    });
    vi.mocked(api.getOverviewAnalytics).mockResolvedValue(mockAnalyticsData);

    render(<App />);

    // Login as Coordinator
    const emailInput = screen.getByLabelText(/E-mail Institucional/i);
    const passwordInput = screen.getByLabelText(/Senha/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'coord@linsdorego.edu.br');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'coord123');
    await user.click(
      screen.getByRole('button', { name: /Entrar no Terminal/i }),
    );

    // Verify Coordination Page rendered
    expect(
      await screen.findByText(/Painel da Coordenação/i),
    ).toBeInTheDocument();

    // Click Analytics Dashboard navigation button
    const analyticsNavBtn = screen.getByRole('button', {
      name: /Dashboard Geral|Painel Analítico/i,
    });
    await user.click(analyticsNavBtn);

    // Verify Analytics Dashboard Page is now displayed
    expect(
      await screen.findByText(/Indicadores de Fluxo e Permanência/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tempo Médio Fora de Sala/i)).toBeInTheDocument();
  });
});
