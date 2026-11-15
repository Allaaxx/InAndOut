import { TerminalPage } from '@client/pages/TerminalPage';
import { api } from '@client/services/api';
import type { MovementDTO } from '@shared/dtos';
import {
  AlertLevel,
  MovementStatus,
  QueueEntryStatus,
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
    enqueueWaiting: vi.fn(),
    cancelQueue: vi.fn(),
    claimQueueSlot: vi.fn(),
  },
}));

describe('Frontend Seam: Classroom Terminal Virtual Numeric Keypad, Public Student Display & Real-Time Updates', () => {
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
    startedAt: new Date(Date.now() - 60_000).toISOString(),
    plannedDurationMinutes: 50,
    defaultTimeLimitMinutes: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(socketListeners)) {
      delete socketListeners[key];
    }
  });

  it('allows a student to type their RA on the virtual numeric keypad, submit exit, and displays LGPD abbreviated name with Em Trânsito badge', async () => {
    const user = userEvent.setup();

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: activeSessionDTO,
      activeMovements: [],
      queue: [],
    });

    const lucasMovement: MovementDTO = {
      id: 'mov-1',
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
      startedAt: new Date().toISOString(),
      allowedLimitMinutes: 10,
      isEmergency: false,
      isGuest: false,
    };

    vi.mocked(api.requestExit).mockResolvedValueOnce({
      movement: lucasMovement,
    });

    render(
      <TerminalPage
        user={teacherUser}
        token="jwt-access-token"
        onVerifyPin={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    // Wait for active session and keypad to appear
    expect(await screen.findByText(/Sala Livre/i)).toBeInTheDocument();

    const raInput = screen.getByLabelText(
      /RA do Estudante/i,
    ) as HTMLInputElement;
    expect(raInput.value).toBe('');

    // Enter '10019' then backspace '9' -> '1001' using virtual keypad buttons
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '9' }));
    expect(raInput.value).toBe('10019');

    await user.click(screen.getByRole('button', { name: /Apagar/i }));
    expect(raInput.value).toBe('1001');

    // Submit exit
    const submitBtn = screen.getByRole('button', { name: /Registrar Saída/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.requestExit).toHaveBeenCalledWith(
        {
          ra: '1001',
          sessionId: 'session-101',
        },
        'jwt-access-token',
      );
    });

    // Keypad input cleared and public card displays abbreviated name "Lucas S." + "Em Trânsito" badge
    expect(raInput.value).toBe('');
    expect(await screen.findByText('Lucas S.')).toBeInTheDocument();
    expect(screen.queryByText('Lucas Silva')).not.toBeInTheDocument();
    expect(screen.getByText(/Em Trânsito/i)).toBeInTheDocument();
  });

  it('automatically enqueues second student to waiting queue via keypad (Auto-Enfileiramento por RA) when room is occupied', async () => {
    const user = userEvent.setup();

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: activeSessionDTO,
      activeMovements: [],
      queue: [],
    });

    vi.mocked(api.enqueueWaiting).mockResolvedValueOnce({
      entry: {
        id: 'queue-entry-joao',
        sessionId: activeSessionDTO.id,
        studentRa: '1002',
        studentFullName: 'João Mendes',
        studentPublicName: 'João M.',
        abbreviatedName: 'João M.',
        position: 1,
        status: QueueEntryStatus.WAITING,
        requestedAt: new Date().toISOString(),
      },
      queue: [
        {
          id: 'queue-entry-joao',
          sessionId: activeSessionDTO.id,
          studentRa: '1002',
          studentFullName: 'João Mendes',
          studentPublicName: 'João M.',
          abbreviatedName: 'João M.',
          position: 1,
          status: QueueEntryStatus.WAITING,
          requestedAt: new Date().toISOString(),
        },
      ],
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

    // Simulate real-time Socket.io event (movement:started) arriving for Lucas S.
    const socketMovement: MovementDTO = {
      id: 'mov-socket-1',
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
      startedAt: new Date().toISOString(),
      allowedLimitMinutes: 10,
      isEmergency: false,
      isGuest: false,
    };

    act(() => {
      const listeners =
        socketListeners['movement:started'] ??
        socketListeners['movement:exit'] ??
        [];
      for (const listener of listeners) {
        listener(socketMovement);
      }
    });

    expect(await screen.findByText('Lucas S.')).toBeInTheDocument();
    expect(screen.getByText(/Em Trânsito/i)).toBeInTheDocument();

    // Second student (RA 1002) types RA on virtual keypad while room is occupied
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '2' }));

    await user.click(screen.getByRole('button', { name: /Registrar Saída/i }));

    // Automatically calls enqueueWaiting without requiring a secondary form
    await waitFor(() => {
      expect(api.enqueueWaiting).toHaveBeenCalledWith(
        {
          ra: '1002',
          sessionId: 'session-101',
        },
        'jwt-access-token',
      );
    });

    expect(await screen.findByTestId('queue-next-indicator')).toHaveTextContent(
      /Próximo:.*João M\./i,
    );
    expect(screen.getByText('Lucas S.')).toBeInTheDocument();
  });

  it('registers return when student currently outside enters RA on the keypad and clicks Registrar Saída', async () => {
    const user = userEvent.setup();

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
      startedAt: new Date().toISOString(),
      allowedLimitMinutes: 10,
      isEmergency: false,
      isGuest: false,
    };

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: activeSessionDTO,
      activeMovements: [activeLucasMovement],
      queue: [],
    });

    vi.mocked(api.registerReturn).mockResolvedValueOnce({
      movement: {
        ...activeLucasMovement,
        status: MovementStatus.RETURNED_NORMAL,
        endedAt: new Date().toISOString(),
      },
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

    expect(await screen.findByText('Lucas S.')).toBeInTheDocument();

    // Student types their RA 1001 and clicks "Registrar Saída"
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '1' }));

    await user.click(screen.getByRole('button', { name: /Registrar Saída/i }));

    await waitFor(() => {
      expect(api.registerReturn).toHaveBeenCalledWith(
        {
          ra: '1001',
          sessionId: 'session-101',
        },
        'jwt-access-token',
      );
    });

    expect(await screen.findByText(/Sala Livre/i)).toBeInTheDocument();
  });
});
