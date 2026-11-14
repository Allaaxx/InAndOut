import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TerminalPage } from '@client/pages/TerminalPage';
import { api } from '@client/services/api';
import {
  AlertLevel,
  MovementStatus,
  QueueEntryStatus,
  SessionStatus,
  UserRole,
} from '@shared/enums';
import { MovementDTO, WaitingQueueDTO } from '@shared/dtos';

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
    enqueueWaiting: vi.fn(),
    cancelQueue: vi.fn(),
    claimQueueSlot: vi.fn(),
  },
}));

describe('Frontend Seam: FIFO Waiting Queue Panel, 2-Minute Confirmation Window & Voluntary Cancellation', () => {
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
    startedAt: new Date(Date.now() - 15 * 60_000).toISOString(),
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
    startedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    allowedLimitMinutes: 10,
    isEmergency: false,
    isGuest: false,
  };

  const waitingJoaoEntry: WaitingQueueDTO = {
    id: 'queue-entry-1',
    sessionId: activeSessionDTO.id,
    studentRa: '1002',
    studentFullName: 'João Mendes',
    studentPublicName: 'João M.',
    abbreviatedName: 'João M.',
    position: 1,
    status: QueueEntryStatus.WAITING,
    requestedAt: new Date(Date.now() - 3 * 60_000).toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(socketListeners)) {
      delete socketListeners[key];
    }
  });

  it('displays waiting queue with discrete next label ("Próximo: João M."), enqueues a student, and renders queue position', async () => {
    const user = userEvent.setup();

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: activeSessionDTO,
      activeMovements: [activeLucasMovement],
      queue: [],
    });

    vi.mocked(api.enqueueWaiting).mockResolvedValueOnce({
      entry: waitingJoaoEntry,
      queue: [waitingJoaoEntry],
    });

    render(
      <TerminalPage
        user={teacherUser}
        token="jwt-access-token"
        onVerifyPin={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    // Initial empty state
    expect(
      await screen.findByText(/Nenhum aluno na fila de espera no momento/i)
    ).toBeInTheDocument();

    // Type RA 1002 in queue input and click "Entrar na Fila"
    const queueInput = screen.getByPlaceholderText(/Digitar RA para entrar na fila/i);
    await user.type(queueInput, '1002');

    const joinBtn = screen.getByRole('button', { name: /Entrar na Fila/i });
    await user.click(joinBtn);

    await waitFor(() => {
      expect(api.enqueueWaiting).toHaveBeenCalledWith(
        {
          ra: '1002',
          sessionId: 'session-101',
        },
        'jwt-access-token'
      );
    });

    // Displays discreet next label
    expect(await screen.findByTestId('queue-next-indicator')).toHaveTextContent(
      /Próximo:.*João M\./i
    );
    expect(screen.getByTestId('queue-item-1002')).toHaveTextContent(
      /#1.*João M\..*Na Fila/i
    );
  });

  it('displays 2-minute confirmation window alert when next student is called, and starts movement on claim', async () => {
    const user = userEvent.setup();

    const calledJoaoEntry: WaitingQueueDTO = {
      ...waitingJoaoEntry,
      status: QueueEntryStatus.CALLED,
      calledAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 60_000).toISOString(),
    };

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: activeSessionDTO,
      activeMovements: [],
      queue: [calledJoaoEntry],
    });

    const claimedJoaoMovement: MovementDTO = {
      id: 'mov-joao-1',
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
      isEmergency: false,
      isGuest: false,
    };

    vi.mocked(api.claimQueueSlot).mockResolvedValueOnce({
      movement: claimedJoaoMovement,
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

    // Confirmation window alert appears
    expect(
      await screen.findByText(/Vaga liberada para João M\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Janela de confirmação:/i)).toBeInTheDocument();
    expect(screen.getByText(/Aguardando Confirmação/i)).toBeInTheDocument();

    // Student confirms exit
    const confirmBtn = screen.getByRole('button', {
      name: /Confirmar Saída/i,
    });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(api.claimQueueSlot).toHaveBeenCalledWith(
        {
          ra: '1002',
          sessionId: 'session-101',
        },
        'jwt-access-token'
      );
    });

    // João M. is now displayed outside as active student
    expect(await screen.findByText('João M.')).toBeInTheDocument();
    expect(screen.getByText(/Em Trânsito/i)).toBeInTheDocument();
  });

  it('allows voluntary cancellation of queue position via Desistir button and updates queue', async () => {
    const user = userEvent.setup();

    const waitingAnaEntry: WaitingQueueDTO = {
      id: 'queue-entry-2',
      sessionId: activeSessionDTO.id,
      studentRa: '1003',
      studentFullName: 'Ana Costa',
      studentPublicName: 'Ana C.',
      abbreviatedName: 'Ana C.',
      position: 1,
      status: QueueEntryStatus.WAITING,
      requestedAt: new Date().toISOString(),
    };

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: activeSessionDTO,
      activeMovements: [activeLucasMovement],
      queue: [waitingAnaEntry],
    });

    vi.mocked(api.cancelQueue).mockResolvedValueOnce({
      cancelled: true,
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

    expect(await screen.findByTestId('queue-next-indicator')).toHaveTextContent(
      /Próximo:.*Ana C\./i
    );

    const cancelBtn = screen.getByRole('button', { name: /Desistir/i });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(api.cancelQueue).toHaveBeenCalledWith(
        '1003',
        'session-101',
        'jwt-access-token'
      );
    });

    expect(
      await screen.findByText(/Nenhum aluno na fila de espera no momento/i)
    ).toBeInTheDocument();
  });

  it('updates waiting queue and triggers confirmation window via Socket.io events', async () => {
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
      />
    );

    expect(
      await screen.findByText(/Nenhum aluno na fila de espera no momento/i)
    ).toBeInTheDocument();

    // 1. Simulate Socket.io queue:updated event
    act(() => {
      const listeners = socketListeners['queue:updated'] ?? [];
      for (const listener of listeners) {
        listener({
          sessionId: activeSessionDTO.id,
          queue: [waitingJoaoEntry],
        });
      }
    });

    expect(await screen.findByTestId('queue-next-indicator')).toHaveTextContent(
      /Próximo:.*João M\./i
    );

    // 2. Simulate Socket.io queue:slot-called event
    const calledJoaoEntry: WaitingQueueDTO = {
      ...waitingJoaoEntry,
      status: QueueEntryStatus.CALLED,
      calledAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 60_000).toISOString(),
    };

    act(() => {
      const listeners = socketListeners['queue:slot-called'] ?? [];
      for (const listener of listeners) {
        listener({
          sessionId: activeSessionDTO.id,
          entry: calledJoaoEntry,
          expiresAt: calledJoaoEntry.expiresAt!,
        });
      }
    });

    expect(
      await screen.findByText(/Vaga liberada para João M\./i)
    ).toBeInTheDocument();
  });
});
