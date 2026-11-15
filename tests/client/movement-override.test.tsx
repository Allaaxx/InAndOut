import { TerminalPage } from '@client/pages/TerminalPage';
import { api } from '@client/services/api';
import type { MovementDTO } from '@shared/dtos';
import {
  AlertLevel,
  MovementStatus,
  SessionStatus,
  UserRole,
} from '@shared/enums';
import { render, screen, waitFor } from '@testing-library/react';
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
    login: vi.fn(),
    verifyPin: vi.fn(),
    refreshToken: vi.fn(),
    getActiveSession: vi.fn(),
    startSession: vi.fn(),
    endSession: vi.fn(),
    requestExit: vi.fn(),
    registerReturn: vi.fn(),
    requestEmergencyExit: vi.fn(),
    requestGuestExit: vi.fn(),
  },
}));

describe('Frontend Seam: Teacher Override Controls (Liberação de Emergência & Autorização Avulsa via Shadcn AlertDialog)', () => {
  const teacherUser = {
    id: 'teacher-1',
    name: 'Prof. Carlos Eduardo',
    email: 'prof@linsdorego.edu.br',
    role: UserRole.TEACHER,
  };

  const activeSessionDTO = {
    id: 'session-101',
    teacherId: teacherUser.id,
    teacherName: teacherUser.name,
    roomId: 'SALA-01',
    classCode: '1A',
    subject: 'Matemática',
    status: SessionStatus.ACTIVE,
    startedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    plannedDurationMinutes: 50,
    defaultTimeLimitMinutes: 10,
  };

  const activeLucasMovement: MovementDTO = {
    id: 'mov-active-1',
    sessionId: activeSessionDTO.id,
    studentId: 'student-1',
    studentRa: '1001',
    studentFullName: 'Lucas Silva',
    studentPublicName: 'Lucas S.',
    abbreviatedName: 'Lucas S.',
    classCode: '1A',
    subject: 'Matemática',
    status: MovementStatus.IN_TRANSIT,
    alertLevel: AlertLevel.GREEN,
    startedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    allowedLimitMinutes: 10,
    isEmergency: false,
    isGuest: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows the teacher to open the Liberação de Emergência AlertDialog and authorize a concurrent student exit when the room is occupied', async () => {
    const user = userEvent.setup();

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: activeSessionDTO,
      activeMovements: [activeLucasMovement],
      queue: [],
    });

    const emergencyJoaoMovement: MovementDTO = {
      id: 'mov-emergency-2',
      sessionId: activeSessionDTO.id,
      studentId: 'student-2',
      studentRa: '1002',
      studentFullName: 'João Mendes',
      studentPublicName: 'João M.',
      abbreviatedName: 'João M.',
      classCode: '1A',
      subject: 'Matemática',
      status: MovementStatus.IN_TRANSIT,
      alertLevel: AlertLevel.GREEN,
      startedAt: new Date().toISOString(),
      allowedLimitMinutes: 10,
      isEmergency: true,
      isGuest: false,
      authorizedByTeacherId: teacherUser.id,
    };

    vi.mocked(api.requestEmergencyExit).mockResolvedValueOnce({
      movement: emergencyJoaoMovement,
    });

    render(
      <TerminalPage
        user={teacherUser}
        token="jwt-access-token"
        onVerifyPin={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    // Room is currently occupied by Lucas S.
    expect(await screen.findByText('Lucas S.')).toBeInTheDocument();

    // Teacher clicks dedicated "Liberação de Emergência" button
    const emergencyBtn = screen.getByRole('button', {
      name: /Liberação de Emergência/i,
    });
    await user.click(emergencyBtn);

    // Protected Shadcn AlertDialog opens
    expect(
      await screen.findByRole('heading', {
        name: /Confirmar Liberação de Emergência/i,
      }),
    ).toBeInTheDocument();

    const raInput = screen.getByLabelText(/RA para Emergência/i);
    const reasonInput = screen.getByLabelText(/Motivo/i);

    await user.type(raInput, '1002');
    await user.type(reasonInput, 'Mal-estar súbito');

    const confirmBtn = screen.getByRole('button', {
      name: /Confirmar Emergência/i,
    });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(api.requestEmergencyExit).toHaveBeenCalledWith(
        {
          ra: '1002',
          sessionId: 'session-101',
          reason: 'Mal-estar súbito',
        },
        'jwt-access-token',
      );
    });

    // Confirmation status banner displays the authorized emergency exit with abbreviated name
    expect(
      await screen.findByTestId('override-status-banner'),
    ).toHaveTextContent(/João M\./i);
  });

  it('allows the teacher to open the Autorização Avulsa AlertDialog, authorize a guest student from another class, and handles API validation errors', async () => {
    const user = userEvent.setup();

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: activeSessionDTO,
      activeMovements: [],
      queue: [],
    });

    const guestPedroMovement: MovementDTO = {
      id: 'mov-guest-1',
      sessionId: activeSessionDTO.id,
      studentId: 'student-4',
      studentRa: '2001',
      studentFullName: 'Pedro Alves',
      studentPublicName: 'Pedro A.',
      abbreviatedName: 'Pedro A.',
      classCode: '1A',
      subject: 'Matemática',
      status: MovementStatus.IN_TRANSIT,
      alertLevel: AlertLevel.GREEN,
      startedAt: new Date().toISOString(),
      allowedLimitMinutes: 10,
      isEmergency: false,
      isGuest: true,
      authorizedByTeacherId: teacherUser.id,
    };

    // First call rejects with validation error, second call succeeds
    vi.mocked(api.requestGuestExit)
      .mockRejectedValueOnce(new Error('RA inválido ou não informado.'))
      .mockResolvedValueOnce({
        movement: guestPedroMovement,
      });

    render(
      <TerminalPage
        user={teacherUser}
        token="jwt-access-token"
        onVerifyPin={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    expect(await screen.findByText(/Sala Livre/i)).toBeInTheDocument();

    // Teacher clicks dedicated "Autorização Avulsa" button
    const guestBtn = screen.getByRole('button', {
      name: /Autorização Avulsa/i,
    });
    await user.click(guestBtn);

    expect(
      await screen.findByRole('heading', {
        name: /Confirmar Autorização Avulsa/i,
      }),
    ).toBeInTheDocument();

    const guestRaInput = screen.getByLabelText(/RA do Aluno Avulso/i);
    await user.type(guestRaInput, '2001');

    const confirmGuestBtn = screen.getByRole('button', {
      name: /Confirmar Autorização/i,
    });

    // First attempt triggers error alert inside modal
    await user.click(confirmGuestBtn);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /RA inválido ou não informado/i,
    );

    // Second attempt succeeds
    await user.click(confirmGuestBtn);

    await waitFor(() => {
      expect(api.requestGuestExit).toHaveBeenCalledWith(
        expect.objectContaining({
          ra: '2001',
          sessionId: 'session-101',
        }),
        'jwt-access-token',
      );
    });

    // Public terminal displays abbreviated name "Pedro A." and override confirmation banner
    expect(await screen.findByText('Pedro A.')).toBeInTheDocument();
    expect(screen.getByTestId('override-status-banner')).toHaveTextContent(
      /Autorização avulsa concedida.*Pedro A\./i,
    );
  });
});
