import { CoordinationPage } from '@client/pages/CoordinationPage';
import { api } from '@client/services/api';
import type { MovementDTO, UserDTO } from '@shared/dtos';
import { AlertLevel, MovementStatus, UserRole } from '@shared/enums';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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
    resolveMovement: vi.fn(),
  },
}));

describe('Frontend Seam: Coordination Context & Resolution Sheet (User Story 20)', () => {
  const coordUser: UserDTO = {
    id: 'coord-1',
    name: 'Coord. Mariana Alves',
    email: 'coord@linsdorego.edu.br',
    role: UserRole.COORDINATOR,
  };

  const sampleMovement: MovementDTO = {
    id: 'mov-coord-1',
    sessionId: 'session-101',
    studentId: 'student-1',
    studentRa: '1001',
    studentFullName: 'Lucas Silva',
    studentPublicName: 'Lucas S.',
    abbreviatedName: 'Lucas S.',
    classCode: '3C',
    roomId: 'SALA-03',
    teacherName: 'Prof. Roberto Silva',
    authorizedByTeacherId: 'teacher-roberto',
    subject: 'Química',
    status: MovementStatus.ESCALATED_TO_COORDINATION,
    alertLevel: AlertLevel.RED,
    startedAt: new Date(Date.now() - 15 * 60_000).toISOString(),
    allowedLimitMinutes: 10,
    elapsedMinutes: 15,
    isEmergency: false,
    isGuest: false,
  };

  it('renders student photo/avatar placeholder, originating classroom, and teacher in table and resolution sheet', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValueOnce({
      movements: [sampleMovement],
    });

    render(<CoordinationPage user={coordUser} token="jwt-coord-token" />);

    // Check table display: avatar placeholder, student name and RA
    expect(await screen.findByText('Lucas S.')).toBeInTheDocument();
    expect(screen.getByText('RA: 1001')).toBeInTheDocument();
    expect(screen.getByTestId('student-avatar')).toBeInTheDocument();

    // Check originating classroom and teacher in table
    expect(screen.getByText('3C')).toBeInTheDocument();
    expect(screen.getByText('SALA-03')).toBeInTheDocument();
    expect(screen.getByText(/Prof: Prof\. Roberto Silva/i)).toBeInTheDocument();

    // Open resolution sheet
    const actionBtn = screen.getByRole('button', { name: /Ação Imediata/i });
    await user.click(actionBtn);

    // Verify resolution sheet shows avatar placeholder, originating classroom, teacher name, and absent duration
    expect(
      await screen.findByTestId('coordination-student-avatar'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Turma \/ Sala de Origem/i)).toBeInTheDocument();
    expect(screen.getByText(/3C \(SALA-03\)/i)).toBeInTheDocument();
    expect(screen.getByText('Prof. Roberto Silva')).toBeInTheDocument();
    expect(screen.getAllByText(/15 min/i).length).toBeGreaterThanOrEqual(2);
  });
});
