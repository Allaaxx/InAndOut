import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TerminalPage } from '@client/pages/TerminalPage';
import { ActiveExitCard } from '@client/components/terminal/ActiveExitCard';
import { api } from '@client/services/api';
import {
  AlertLevel,
  MovementStatus,
  SessionStatus,
  UserRole,
} from '@shared/enums';
import { MovementDTO } from '@shared/dtos';

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
          (fn) => fn !== cb
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
    escalateMovement: vi.fn(),
    checkOverdueMovements: vi.fn(),
  },
}));

describe('Frontend Seam: Time Limit Monitoring, Medical Tempo Especial & Hybrid Escalation', () => {
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
    startedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    plannedDurationMinutes: 50,
    defaultTimeLimitMinutes: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(socketListeners)) {
      delete socketListeners[key];
    }
  });

  it('displays badge color transitions (GREEN -> YELLOW -> RED) and 2-minute tolerance banner for overdue departures', () => {
    const regularMovementGreen: MovementDTO = {
      id: 'mov-1',
      sessionId: 'session-101',
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      studentPublicName: 'Lucas S.',
      abbreviatedName: 'Lucas S.',
      classCode: '1A',
      subject: 'Matemática',
      status: MovementStatus.IN_TRANSIT,
      alertLevel: AlertLevel.GREEN,
      startedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      allowedLimitMinutes: 10,
      elapsedMinutes: 5,
      isEmergency: false,
      isGuest: false,
    };

    const { rerender } = render(
      <ActiveExitCard activeMovements={[regularMovementGreen]} />
    );

    // GREEN: displays "Em Trânsito" badge, no warning banner, no escalate button
    expect(screen.getByText('Lucas S.')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-normal')).toHaveTextContent(
      /Em Trânsito/i
    );
    expect(
      screen.queryByTestId('overdue-warning-banner')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Escalar para Coordenação/i })
    ).not.toBeInTheDocument();

    // YELLOW: at 80% threshold, badge transitions to warning
    const regularMovementYellow: MovementDTO = {
      ...regularMovementGreen,
      alertLevel: AlertLevel.YELLOW,
      elapsedMinutes: 8,
    };

    rerender(<ActiveExitCard activeMovements={[regularMovementYellow]} />);
    expect(screen.getByTestId('status-badge-warning')).toHaveTextContent(
      /Atenção/i
    );
    expect(
      screen.queryByTestId('overdue-warning-banner')
    ).not.toBeInTheDocument();

    // RED: at > 100% threshold (OVERDUE), badge transitions to red, warning banner appears with 2-minute tolerance window, and escalate button is visible
    const regularMovementRed: MovementDTO = {
      ...regularMovementGreen,
      status: MovementStatus.OVERDUE,
      alertLevel: AlertLevel.RED,
      elapsedMinutes: 11,
      overdueAt: new Date(Date.now() - 60_000).toISOString(),
    };

    rerender(<ActiveExitCard activeMovements={[regularMovementRed]} />);
    expect(screen.getByTestId('status-badge-overdue')).toHaveTextContent(
      /Tempo Esgotado/i
    );
    expect(screen.getByTestId('overdue-warning-banner')).toBeInTheDocument();
    expect(screen.getByTestId('overdue-warning-banner')).toHaveTextContent(
      /2 minutos/i
    );
    expect(
      screen.getByRole('button', { name: /Escalar para Coordenação/i })
    ).toBeInTheDocument();
  });

  it('supports medical Tempo Especial student displaying special limit indicator', () => {
    const medicalMovement: MovementDTO = {
      id: 'mov-med',
      sessionId: 'session-101',
      studentId: 'student-3',
      studentRa: '1003',
      studentFullName: 'Ana Costa',
      studentPublicName: 'Ana C.',
      abbreviatedName: 'Ana C.',
      classCode: '1A',
      subject: 'Matemática',
      status: MovementStatus.IN_TRANSIT,
      alertLevel: AlertLevel.GREEN,
      startedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
      allowedLimitMinutes: 20,
      elapsedMinutes: 12,
      isEmergency: false,
      isGuest: false,
    };

    render(<ActiveExitCard activeMovements={[medicalMovement]} />);

    expect(screen.getByText('Ana C.')).toBeInTheDocument();
    expect(screen.getByTestId('tempo-especial-badge')).toHaveTextContent(
      /20 min/i
    );
    expect(screen.getByTestId('status-badge-normal')).toHaveTextContent(
      /Em Trânsito/i
    );
  });

  it('allows the teacher to manually escalate an overdue departure to Coordination with immediate feedback', async () => {
    const user = userEvent.setup();

    const overdueMovement: MovementDTO = {
      id: 'mov-overdue-1',
      sessionId: activeSessionDTO.id,
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      studentPublicName: 'Lucas S.',
      abbreviatedName: 'Lucas S.',
      classCode: '1A',
      subject: 'Matemática',
      status: MovementStatus.OVERDUE,
      alertLevel: AlertLevel.RED,
      startedAt: new Date(Date.now() - 11 * 60_000).toISOString(),
      allowedLimitMinutes: 10,
      elapsedMinutes: 11,
      overdueAt: new Date(Date.now() - 60_000).toISOString(),
      isEmergency: false,
      isGuest: false,
    };

    const escalatedMovement: MovementDTO = {
      ...overdueMovement,
      status: MovementStatus.ESCALATED_TO_COORDINATION,
      escalationType: 'MANUAL',
      escalatedAt: new Date().toISOString(),
    };

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: activeSessionDTO,
      activeMovements: [overdueMovement],
      queue: [],
    });

    vi.mocked(api.escalateMovement).mockResolvedValueOnce({
      movement: escalatedMovement,
    });

    render(
      <TerminalPage
        user={teacherUser}
        token="jwt-access-token"
        onVerifyPin={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    // Card displays overdue warning banner and action button
    expect(await screen.findByText('Lucas S.')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-overdue')).toBeInTheDocument();

    const escalateBtn = screen.getByRole('button', {
      name: /Escalar para Coordenação/i,
    });
    expect(escalateBtn).toBeInTheDocument();

    await user.click(escalateBtn);

    await waitFor(() => {
      expect(api.escalateMovement).toHaveBeenCalledWith(
        'mov-overdue-1',
        expect.any(Object),
        'jwt-access-token'
      );
    });

    // Displays updated status badge and escalated banner
    expect(
      await screen.findByTestId('status-badge-escalated')
    ).toHaveTextContent(/Escalado para Coordenação/i);
    expect(screen.getByTestId('escalated-warning-banner')).toBeInTheDocument();
  });

  it('updates the card reactively when WebSocket events (movement:overdue and movement:escalated) are received', async () => {
    const regularMovement: MovementDTO = {
      id: 'mov-ws-1',
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
      startedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      allowedLimitMinutes: 10,
      elapsedMinutes: 5,
      isEmergency: false,
      isGuest: false,
    };

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: activeSessionDTO,
      activeMovements: [regularMovement],
      queue: [],
    });

    render(
      <TerminalPage
        user={teacherUser}
        token="jwt-access-token"
        onVerifyPin={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(await screen.findByText('Lucas S.')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-normal')).toBeInTheDocument();

    // 1) WebSocket emits movement:overdue
    act(() => {
      const overduePayload: MovementDTO = {
        ...regularMovement,
        status: MovementStatus.OVERDUE,
        alertLevel: AlertLevel.RED,
        overdueAt: new Date().toISOString(),
      };
      for (const cb of socketListeners['movement:overdue'] ?? []) {
        cb(overduePayload);
      }
    });

    expect(
      await screen.findByTestId('status-badge-overdue')
    ).toBeInTheDocument();
    expect(screen.getByTestId('overdue-warning-banner')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Escalar para Coordenação/i })
    ).toBeInTheDocument();

    // 2) WebSocket emits movement:escalated (after 2 minutes automatic escalation)
    act(() => {
      const autoEscalatedPayload: MovementDTO = {
        ...regularMovement,
        status: MovementStatus.ESCALATED_TO_COORDINATION,
        alertLevel: AlertLevel.RED,
        escalationType: 'AUTOMATIC',
        escalatedAt: new Date().toISOString(),
      };
      for (const cb of socketListeners['movement:escalated'] ?? []) {
        cb(autoEscalatedPayload);
      }
    });

    expect(
      await screen.findByTestId('status-badge-escalated')
    ).toBeInTheDocument();
    expect(screen.getByTestId('escalated-warning-banner')).toBeInTheDocument();
    expect(screen.getByTestId('escalated-warning-banner')).toHaveTextContent(
      /automático/i
    );
  });
});
