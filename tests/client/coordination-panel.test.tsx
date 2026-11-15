import * as SonnerModule from '@client/components/ui/Sonner';
import { CoordinationPage } from '@client/pages/CoordinationPage';
import { api } from '@client/services/api';
import type { MovementDTO, UserDTO } from '@shared/dtos';
import { AlertLevel, MovementStatus, UserRole } from '@shared/enums';
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
    getCoordinationActiveMovements: vi.fn(),
    escalateMovement: vi.fn(),
  },
}));

describe('Frontend Seam: CoordinationPage Real-Time Panel & Alerts (DataTable + Sonner)', () => {
  const coordUser: UserDTO = {
    id: 'coord-1',
    name: 'Coord. Mariana Alves',
    email: 'coord@linsdorego.edu.br',
    role: UserRole.COORDINATOR,
  };

  const initialMovements: MovementDTO[] = [
    {
      id: 'mov-1',
      sessionId: 'session-101',
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      studentPublicName: 'Lucas S.',
      abbreviatedName: 'Lucas S.',
      classCode: '1A',
      subject: 'Matemática',
      roomId: 'SALA-01',
      status: MovementStatus.IN_TRANSIT,
      alertLevel: AlertLevel.GREEN,
      startedAt: '2026-03-10T08:00:00.000Z',
      allowedLimitMinutes: 10,
      elapsedMinutes: 4,
      isEmergency: false,
      isGuest: false,
    },
    {
      id: 'mov-2',
      sessionId: 'session-102',
      studentId: 'student-2',
      studentRa: '2001',
      studentFullName: 'Pedro Alves',
      studentPublicName: 'Pedro A.',
      abbreviatedName: 'Pedro A.',
      classCode: '2B',
      subject: 'História',
      roomId: 'SALA-02',
      status: MovementStatus.ESCALATED_TO_COORDINATION,
      alertLevel: AlertLevel.RED,
      startedAt: '2026-03-10T07:45:00.000Z',
      allowedLimitMinutes: 10,
      elapsedMinutes: 19,
      isEmergency: false,
      isGuest: false,
      escalationType: 'MANUAL',
      escalatedAt: '2026-03-10T07:56:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(socketListeners)) {
      delete socketListeners[key];
    }
  });

  it('renders active exits in Shadcn DataTable with classCode, student name, and status', async () => {
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValueOnce({
      movements: initialMovements,
    });

    render(<CoordinationPage user={coordUser} token="mock-coord-token" />);

    expect(screen.getByText(/Painel da Coordenação/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Lucas S.')).toBeInTheDocument();
      expect(screen.getByText('Pedro A.')).toBeInTheDocument();
      expect(screen.getByText('1A')).toBeInTheDocument();
      expect(screen.getByText('2B')).toBeInTheDocument();
    });

    // Check highlighted red row for escalated movement
    const escalatedRow = screen.getByText('Pedro A.').closest('tr');
    expect(escalatedRow).toHaveClass('bg-red-50');
  });

  it('filters active movements by classCode and by status', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValue({
      movements: initialMovements,
    });

    render(<CoordinationPage user={coordUser} token="mock-coord-token" />);

    await waitFor(() => {
      expect(screen.getByText('Lucas S.')).toBeInTheDocument();
      expect(screen.getByText('Pedro A.')).toBeInTheDocument();
    });

    // Filter by classCode
    const classFilterInput = screen.getByPlaceholderText(/Filtrar por turma/i);
    await user.type(classFilterInput, '1A');

    expect(screen.getByText('Lucas S.')).toBeInTheDocument();
    expect(screen.queryByText('Pedro A.')).not.toBeInTheDocument();

    await user.clear(classFilterInput);
    expect(screen.getByText('Pedro A.')).toBeInTheDocument();

    // Filter by status dropdown/select
    const statusSelect = screen.getByRole('combobox', {
      name: /Filtrar por status/i,
    });
    await user.selectOptions(
      statusSelect,
      MovementStatus.ESCALATED_TO_COORDINATION,
    );

    expect(screen.queryByText('Lucas S.')).not.toBeInTheDocument();
    expect(screen.getByText('Pedro A.')).toBeInTheDocument();
  });

  it('updates table in real time via Socket.io events and triggers toast and audio alert on escalation', async () => {
    const toastSpy = vi.spyOn(SonnerModule.toast, 'error');
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValueOnce({
      movements: [initialMovements[0]],
    });

    const onResolveMock = vi.fn();

    render(
      <CoordinationPage
        user={coordUser}
        token="mock-coord-token"
        onResolveMovement={onResolveMock}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Lucas S.')).toBeInTheDocument();
      expect(screen.queryByText('Pedro A.')).not.toBeInTheDocument();
    });

    // 1. New student departure arrives via Socket
    const newMovement: MovementDTO = {
      id: 'mov-3',
      sessionId: 'session-103',
      studentId: 'student-3',
      studentRa: '3001',
      studentFullName: 'Beatriz Lima',
      studentPublicName: 'Beatriz L.',
      abbreviatedName: 'Beatriz L.',
      classCode: '3C',
      subject: 'Física',
      status: MovementStatus.IN_TRANSIT,
      alertLevel: AlertLevel.GREEN,
      startedAt: new Date().toISOString(),
      allowedLimitMinutes: 10,
      elapsedMinutes: 1,
      isEmergency: false,
      isGuest: false,
    };

    act(() => {
      socketListeners['movement:exit']?.forEach((cb) => {
        cb(newMovement);
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Beatriz L.')).toBeInTheDocument();
    });

    // 2. Escalation event arrives via Socket
    const escalatedMovement: MovementDTO = {
      ...newMovement,
      status: MovementStatus.ESCALATED_TO_COORDINATION,
      alertLevel: AlertLevel.RED,
      escalationType: 'AUTOMATIC',
      escalatedAt: new Date().toISOString(),
    };

    act(() => {
      socketListeners['movement:escalated']?.forEach((cb) => {
        cb(escalatedMovement);
      });
    });

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Beatriz L\./),
        expect.anything(),
      );
    });

    // Escalated row displays action button
    const actionButton = screen.getByRole('button', { name: /Ação Imediata/i });
    expect(actionButton).toBeInTheDocument();

    await userEvent.click(actionButton);
    expect(onResolveMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'mov-3' }),
    );

    // 3. Student return arrives via Socket -> removed from active exits
    const returnedMovement: MovementDTO = {
      ...newMovement,
      status: MovementStatus.RETURNED_NORMAL,
      endedAt: new Date().toISOString(),
    };

    act(() => {
      socketListeners['movement:return']?.forEach((cb) => {
        cb(returnedMovement);
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('Beatriz L.')).not.toBeInTheDocument();
    });
  });

  it('allows toggling audio alerts on and off', async () => {
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValueOnce({
      movements: [],
    });

    const user = userEvent.setup();
    render(<CoordinationPage user={coordUser} token="mock-coord-token" />);

    const soundToggle = screen.getByRole('button', { name: /Alerta Sonoro/i });
    expect(soundToggle).toHaveTextContent(/Ativado/i);

    await user.click(soundToggle);
    expect(soundToggle).toHaveTextContent(/Silenciado/i);
  });
});
