import { TerminalPage } from '@client/pages/TerminalPage';
import { api } from '@client/services/api';
import type { MovementDTO } from '@shared/dtos';
import {
  AlertLevel,
  MovementStatus,
  SessionStatus,
  UserRole,
} from '@shared/enums';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const socketListeners: Record<string, Array<(payload: unknown) => void>> = {};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn((event: string, cb: (payload: unknown) => void) => {
      if (!socketListeners[event]) {
        socketListeners[event] = [];
      }
      socketListeners[event].push(cb);
    }),
    off: vi.fn((event: string, cb: (payload: unknown) => void) => {
      if (socketListeners[event]) {
        socketListeners[event] = socketListeners[event].filter(
          (fn) => fn !== cb,
        );
      }
    }),
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
  },
}));

describe('Frontend Seam: Student Return by RA, Occupancy Card Clearing & Visual Confirmation', () => {
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
    startedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
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
    startedAt: new Date(Date.now() - 6 * 60_000).toISOString(),
    allowedLimitMinutes: 10,
    isEmergency: false,
    isGuest: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(socketListeners)) {
      delete socketListeners[key];
    }
  });

  it('registers student return via virtual keypad, clears the occupancy card to Sala Livre, and shows visual confirmation ("Retorno registrado com sucesso")', async () => {
    const user = userEvent.setup();

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: activeSessionDTO,
      activeMovements: [activeLucasMovement],
      queue: [],
    });

    const returnedLucasMovement: MovementDTO = {
      ...activeLucasMovement,
      status: MovementStatus.RETURNED_NORMAL,
      endedAt: new Date().toISOString(),
      durationMinutes: 6,
      attendedMinutes: 44,
      attendancePercentage: 88,
    };

    vi.mocked(api.registerReturn).mockResolvedValueOnce({
      movement: returnedLucasMovement,
      message: 'Retorno registrado com sucesso',
      nextCalledQueueEntry: null,
    });

    render(
      <TerminalPage
        user={teacherUser}
        token="jwt-access-token"
        onVerifyPin={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    // Initially shows Lucas S. outside with "Em Trânsito" badge
    expect(await screen.findByText('Lucas S.')).toBeInTheDocument();
    expect(screen.getByText(/Em Trânsito/i)).toBeInTheDocument();

    // Student types RA 1001 on virtual keypad and clicks "Registrar Retorno"
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '1' }));

    const returnBtn = screen.getByRole('button', {
      name: /Registrar Retorno/i,
    });
    await user.click(returnBtn);

    await waitFor(() => {
      expect(api.registerReturn).toHaveBeenCalledWith(
        {
          ra: '1001',
          sessionId: 'session-101',
        },
        'jwt-access-token',
      );
    });

    // Occupancy card is cleared ("Sala Livre" and "Nenhum aluno fora da sala no momento.")
    expect(await screen.findByText(/Sala Livre/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Nenhum aluno fora da sala no momento/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('active-student-outside'),
    ).not.toBeInTheDocument();

    // Visual confirmation is displayed
    expect(
      await screen.findByText(/Retorno registrado com sucesso/i),
    ).toBeInTheDocument();
  });

  it('clears the occupancy card and displays visual confirmation when a return event arrives via Socket.io, and displays error on invalid return RA', async () => {
    const user = userEvent.setup();

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: activeSessionDTO,
      activeMovements: [activeLucasMovement],
      queue: [],
    });

    render(
      <TerminalPage
        user={teacherUser}
        token="jwt-access-token"
        onVerifyPin={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    expect(await screen.findByText('Lucas S.')).toBeInTheDocument();
    expect(screen.getByText(/Em Trânsito/i)).toBeInTheDocument();

    // Simulate Socket.io movement:return / movement:returned broadcast
    const returnedViaSocket: MovementDTO = {
      ...activeLucasMovement,
      status: MovementStatus.RETURNED_NORMAL,
      endedAt: new Date().toISOString(),
      durationMinutes: 5,
      attendedMinutes: 45,
      attendancePercentage: 90,
    };

    act(() => {
      const listeners =
        socketListeners['movement:return'] ??
        socketListeners['movement:returned'] ??
        [];
      for (const listener of listeners) {
        listener(returnedViaSocket);
      }
    });

    expect(await screen.findByText(/Sala Livre/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Retorno registrado com sucesso/i),
    ).toBeInTheDocument();

    // Now test attempting to register return for an RA with no active exit (404)
    vi.mocked(api.registerReturn).mockRejectedValueOnce(
      new Error('Nenhuma saída ativa encontrada para o RA 1002.'),
    );

    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '2' }));

    await user.click(
      screen.getByRole('button', { name: /Registrar Retorno/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Nenhuma saída ativa encontrada para o RA 1002/i,
    );
  });
});
