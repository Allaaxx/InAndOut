import { AnalyticsDashboardPage } from '@client/pages/AnalyticsDashboardPage';
import { api } from '@client/services/api';
import type {
  SchoolOverviewAnalyticsDTO,
  StudentHistoryReportDTO,
  UserDTO,
} from '@shared/dtos';
import { AlertLevel, MovementStatus, UserRole } from '@shared/enums';
import { render, screen } from '@testing-library/react';
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
    getStudentHistory: vi.fn(),
    exportAnalytics: vi.fn(),
  },
}));

describe('Frontend Seam: Student History Report & Export (AnalyticsDashboardPage)', () => {
  const coordinatorUser: UserDTO = {
    id: 'coord-1',
    name: 'Coord. Mariana Alves',
    email: 'coord@linsdorego.edu.br',
    role: UserRole.COORDINATOR,
  };

  const mockOverviewData: SchoolOverviewAnalyticsDTO = {
    stats: {
      averageOutsideMinutes: 8,
      averageAbsentMinutes: 8,
      totalExitsToday: 10,
      complianceRate: 80,
      activeIncidentsCount: 1,
      activeIncidents: 1,
    },
    hourlyDistribution: [],
    peakHours: [],
    outcomeDistribution: [],
    outcomesDistribution: [],
  };

  const mockStudentHistory: StudentHistoryReportDTO = {
    student: {
      id: 'student-1',
      ra: '1001',
      fullName: 'Lucas Silva',
      name: 'Lucas Silva',
      classCode: '1A',
    },
    summary: {
      totalExits: 2,
      totalDepartures: 2,
      totalAbsentMinutes: 20,
      totalMinutesOutside: 20,
      averageDurationMinutes: 10,
      averageDurationPerExit: 10,
      attendedMinutes: 80,
      attendancePercentage: 80,
      effectiveAttendancePercentage: 80,
    },
    history: [
      {
        id: 'mov-1',
        sessionId: 'sess-1',
        studentId: 'student-1',
        studentRa: '1001',
        studentFullName: 'Lucas Silva',
        studentPublicName: 'Lucas S.',
        classCode: '1A',
        subject: 'Matemática',
        status: MovementStatus.RETURNED_NORMAL,
        alertLevel: AlertLevel.GREEN,
        startedAt: '2026-03-10T08:00:00.000Z',
        endedAt: '2026-03-10T08:05:00.000Z',
        allowedLimitMinutes: 10,
        durationMinutes: 5,
        attendedMinutes: 45,
        attendancePercentage: 90,
        isEmergency: false,
        isGuest: false,
      },
      {
        id: 'mov-2',
        sessionId: 'sess-2',
        studentId: 'student-1',
        studentRa: '1001',
        studentFullName: 'Lucas Silva',
        studentPublicName: 'Lucas S.',
        classCode: '1A',
        subject: 'Física',
        status: MovementStatus.RETURNED_NORMAL,
        alertLevel: AlertLevel.GREEN,
        startedAt: '2026-03-10T10:00:00.000Z',
        endedAt: '2026-03-10T10:15:00.000Z',
        allowedLimitMinutes: 10,
        durationMinutes: 15,
        attendedMinutes: 35,
        attendancePercentage: 70,
        isEmergency: false,
        isGuest: false,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getOverviewAnalytics).mockResolvedValue(mockOverviewData);
  });

  it('allows switching between "Visão Geral" and "Consulta por Aluno" tabs using Shadcn Tabs', async () => {
    const user = userEvent.setup();

    render(
      <AnalyticsDashboardPage user={coordinatorUser} token="test-token" />,
    );

    // Initial Overview tab active
    expect(
      await screen.findByRole('tab', { name: /Visão Geral/i }),
    ).toBeInTheDocument();
    const studentTab = screen.getByRole('tab', { name: /Consulta por Aluno/i });
    expect(studentTab).toBeInTheDocument();

    // Click Student Search tab
    await user.click(studentTab);

    // Verify search box appears
    expect(
      screen.getByPlaceholderText(/Digite o RA do aluno/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buscar/i })).toBeInTheDocument();
  });

  it('searches student history by RA and displays student info, summary cards, and movement DataTable', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getStudentHistory).mockResolvedValueOnce(mockStudentHistory);

    render(
      <AnalyticsDashboardPage user={coordinatorUser} token="test-token" />,
    );

    // Switch to Student Search tab
    const studentTab = await screen.findByRole('tab', {
      name: /Consulta por Aluno/i,
    });
    await user.click(studentTab);

    // Type RA and click Buscar
    const raInput = screen.getByPlaceholderText(/Digite o RA do aluno/i);
    await user.type(raInput, '1001');
    const searchButton = screen.getByRole('button', { name: /Buscar/i });
    await user.click(searchButton);

    expect(api.getStudentHistory).toHaveBeenCalledWith(
      '1001',
      expect.anything(),
      'test-token',
    );

    // Verify Student info and Summary Cards
    expect(await screen.findByText('Lucas Silva')).toBeInTheDocument();
    expect(screen.getByText('1A')).toBeInTheDocument();
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getAllByText('10 min').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('80%')).toBeInTheDocument();

    // Verify Movement History in DataTable
    expect(screen.getByText('Matemática')).toBeInTheDocument();
    expect(screen.getByText('Física')).toBeInTheDocument();
  });

  it('displays an error alert when student is not found', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getStudentHistory).mockRejectedValueOnce(
      new Error('Aluno com RA "9999" não encontrado.'),
    );

    render(
      <AnalyticsDashboardPage user={coordinatorUser} token="test-token" />,
    );

    const studentTab = await screen.findByRole('tab', {
      name: /Consulta por Aluno/i,
    });
    await user.click(studentTab);

    const raInput = screen.getByPlaceholderText(/Digite o RA do aluno/i);
    await user.type(raInput, '9999');
    await user.click(screen.getByRole('button', { name: /Buscar/i }));

    expect(
      await screen.findByText(/Aluno com RA "9999" não encontrado/i),
    ).toBeInTheDocument();
  });

  it('triggers PDF and CSV export when clicking export buttons', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getStudentHistory).mockResolvedValue(mockStudentHistory);
    vi.mocked(api.exportAnalytics).mockResolvedValue(
      new Blob(['dummy'], { type: 'text/csv' }),
    );

    // Mock URL.createObjectURL and URL.revokeObjectURL
    const createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.fn();
    window.URL.createObjectURL = createObjectURLSpy;
    window.URL.revokeObjectURL = revokeObjectURLSpy;

    render(
      <AnalyticsDashboardPage user={coordinatorUser} token="test-token" />,
    );

    // Switch to Student tab and search
    await user.click(
      await screen.findByRole('tab', { name: /Consulta por Aluno/i }),
    );
    await user.type(
      screen.getByPlaceholderText(/Digite o RA do aluno/i),
      '1001',
    );
    await user.click(screen.getByRole('button', { name: /Buscar/i }));

    await screen.findByText('Lucas Silva');

    // Click Exportar CSV
    const exportCsvBtn = screen.getByRole('button', { name: /Exportar CSV/i });
    await user.click(exportCsvBtn);

    expect(api.exportAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'csv' }),
      'test-token',
    );

    // Click Exportar PDF
    const exportPdfBtn = screen.getByRole('button', { name: /Exportar PDF/i });
    await user.click(exportPdfBtn);

    expect(api.exportAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'pdf' }),
      'test-token',
    );
  });
});
