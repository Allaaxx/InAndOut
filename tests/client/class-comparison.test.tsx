import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AnalyticsDashboardPage } from '@client/pages/AnalyticsDashboardPage';
import { api } from '@client/services/api';
import { UserRole } from '@shared/enums';
import { SchoolOverviewAnalyticsDTO, UserDTO } from '@shared/dtos';

vi.mock('@client/services/api', () => ({
  api: {
    getOverviewAnalytics: vi.fn(),
    getStudentHistory: vi.fn(),
    exportReport: vi.fn(),
  },
}));

describe('Frontend Seam: Class Comparison Analytics (User Story 25)', () => {
  const adminUser: UserDTO = {
    id: 'admin-1',
    name: 'Diretora Silvia',
    email: 'admin@linsdorego.edu.br',
    role: UserRole.ADMIN,
  };

  const mockAnalyticsData: SchoolOverviewAnalyticsDTO = {
    stats: {
      averageOutsideMinutes: 8.5,
      averageAbsentMinutes: 8.5,
      totalExitsToday: 12,
      complianceRate: 91.7,
      activeIncidentsCount: 1,
      activeIncidents: 1,
    },
    hourlyDistribution: [],
    peakHours: [],
    outcomeDistribution: [],
    outcomesDistribution: [],
    classComparison: [
      {
        classCode: '1A',
        totalExits: 5,
        totalOutsideMinutes: 40,
        averageOutsideMinutes: 8,
      },
      {
        classCode: '2B',
        totalExits: 7,
        totalOutsideMinutes: 62,
        averageOutsideMinutes: 8.9,
      },
    ],
  };

  it('renders the Comparativo por Turma section with frequency and total outside time per class', async () => {
    vi.mocked(api.getOverviewAnalytics).mockResolvedValueOnce(mockAnalyticsData);

    render(
      <AnalyticsDashboardPage
        user={adminUser}
        token="jwt-token"
      />
    );

    expect(await screen.findByText('Comparativo por Turma')).toBeInTheDocument();
    expect(screen.getByTestId('class-comparison-table')).toBeInTheDocument();

    expect(screen.getByText('1A')).toBeInTheDocument();
    expect(screen.getByText('40 min')).toBeInTheDocument();
    expect(screen.getByText('2B')).toBeInTheDocument();
    expect(screen.getByText('62 min')).toBeInTheDocument();
  });
});
