import { CoordinationPage } from '@client/pages/CoordinationPage';
import { api } from '@client/services/api';
import type {
  ActiveRoomSessionSummaryDTO,
  MovementDTO,
  UserDTO,
} from '@shared/dtos';
import { AlertLevel, MovementStatus, UserRole } from '@shared/enums';
import { act, render, screen, waitFor, within } from '@testing-library/react';
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
    resolveMovement: vi.fn(),
  },
}));

describe('Frontend Seam: Coordination Live Multi-Room Cards, Room Column, Filter & Realtime (Ticket #51)', () => {
  const coordUser: UserDTO = {
    id: 'coord-1',
    name: 'Coord. Mariana Alves',
    email: 'coord@linsdorego.edu.br',
    role: UserRole.COORDINATOR,
  };

  const initialActiveRooms: ActiveRoomSessionSummaryDTO[] = [
    {
      sessionId: 'session-101',
      roomId: 'SALA-01',
      roomName: 'Sala 01',
      teacherId: 'teacher-1',
      teacherName: 'Prof. Carlos Eduardo',
      classCode: '1A',
      subject: 'Matemática',
      startedAt: '2026-03-10T08:00:00.000Z',
      activeExitCount: 1,
      hasOverdue: false,
      hasEscalated: false,
    },
    {
      sessionId: 'session-102',
      roomId: 'SALA-02',
      roomName: 'Sala 02',
      teacherId: 'teacher-2',
      teacherName: 'Prof. Ana Paula',
      classCode: '2B',
      subject: 'História',
      startedAt: '2026-03-10T07:45:00.000Z',
      activeExitCount: 1,
      hasOverdue: false,
      hasEscalated: true,
    },
    {
      sessionId: 'session-103',
      roomId: 'LAB-01',
      roomName: 'Laboratório 01',
      teacherId: 'teacher-3',
      teacherName: 'Prof. Marcos Lima',
      classCode: '3C',
      subject: 'Química',
      startedAt: '2026-03-10T08:10:00.000Z',
      activeExitCount: 0,
      hasOverdue: false,
      hasEscalated: false,
    },
  ];

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
      teacherName: 'Prof. Carlos Eduardo',
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
      teacherName: 'Prof. Ana Paula',
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

  it('renders top summary cards for each active room and a dedicated Sala column in the movements table', async () => {
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValueOnce({
      movements: initialMovements,
      activeRooms: initialActiveRooms,
    });

    render(<CoordinationPage user={coordUser} token="mock-coord-token" />);

    const sala01Card = await screen.findByTestId('active-room-card-SALA-01');
    expect(within(sala01Card).getByText('SALA-01')).toBeInTheDocument();
    expect(within(sala01Card).getByText('Sala 01')).toBeInTheDocument();
    expect(
      within(sala01Card).getByText(/Prof\. Carlos Eduardo/i),
    ).toBeInTheDocument();
    expect(within(sala01Card).getByText(/1A/)).toBeInTheDocument();
    expect(within(sala01Card).getByText(/1 fora/i)).toBeInTheDocument();

    const sala02Card = screen.getByTestId('active-room-card-SALA-02');
    expect(within(sala02Card).getByText('SALA-02')).toBeInTheDocument();
    expect(
      within(sala02Card).getByText(/Prof\. Ana Paula/i),
    ).toBeInTheDocument();
    expect(within(sala02Card).getByText(/Alerta Crítico/i)).toBeInTheDocument();

    const lab01Card = screen.getByTestId('active-room-card-LAB-01');
    expect(within(lab01Card).getByText('LAB-01')).toBeInTheDocument();
    expect(within(lab01Card).getByText('Laboratório 01')).toBeInTheDocument();
    expect(within(lab01Card).getByText(/0 fora/i)).toBeInTheDocument();

    // Dedicated "Sala" column header in table
    const table = screen.getByRole('table');
    expect(
      within(table).getByRole('columnheader', { name: /^Sala$/i }),
    ).toBeInTheDocument();
    expect(within(table).getByText('SALA-01')).toBeInTheDocument();
    expect(within(table).getByText('SALA-02')).toBeInTheDocument();
  });

  it('filters active movements by room using the room dropdown and restores all with "Todas as Salas"', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValue({
      movements: initialMovements,
      activeRooms: initialActiveRooms,
    });

    render(<CoordinationPage user={coordUser} token="mock-coord-token" />);

    await waitFor(() => {
      expect(screen.getByText('Lucas S.')).toBeInTheDocument();
      expect(screen.getByText('Pedro A.')).toBeInTheDocument();
    });

    const roomSelect = screen.getByRole('combobox', {
      name: /Filtrar por Sala/i,
    });
    await user.click(roomSelect);
    await user.click(await screen.findByRole('option', { name: /SALA-01/i }));

    expect(screen.getByText('Lucas S.')).toBeInTheDocument();
    expect(screen.queryByText('Pedro A.')).not.toBeInTheDocument();

    await user.click(roomSelect);
    await user.click(
      await screen.findByRole('option', { name: /Todas as Salas/i }),
    );

    expect(screen.getByText('Lucas S.')).toBeInTheDocument();
    expect(screen.getByText('Pedro A.')).toBeInTheDocument();
  });

  it('updates active room cards and table dynamically when session:started and session:ended WebSocket events arrive', async () => {
    const updatedActiveRoomsAfterStart: ActiveRoomSessionSummaryDTO[] = [
      ...initialActiveRooms,
      {
        sessionId: 'session-104',
        roomId: 'SALA-03',
        roomName: 'Sala 03',
        teacherId: 'teacher-4',
        teacherName: 'Prof. Helena Costa',
        classCode: '1B',
        subject: 'Biologia',
        startedAt: '2026-03-10T08:15:00.000Z',
        activeExitCount: 0,
        hasOverdue: false,
        hasEscalated: false,
      },
    ];

    const updatedActiveRoomsAfterEnd: ActiveRoomSessionSummaryDTO[] = [
      initialActiveRooms[0],
      initialActiveRooms[2],
      updatedActiveRoomsAfterStart[3],
    ];

    vi.mocked(api.getCoordinationActiveMovements)
      .mockResolvedValueOnce({
        movements: initialMovements,
        activeRooms: initialActiveRooms,
      })
      .mockResolvedValueOnce({
        movements: initialMovements,
        activeRooms: updatedActiveRoomsAfterStart,
      })
      .mockResolvedValueOnce({
        movements: [initialMovements[0]],
        activeRooms: updatedActiveRoomsAfterEnd,
      });

    render(<CoordinationPage user={coordUser} token="mock-coord-token" />);

    expect(
      await screen.findByTestId('active-room-card-SALA-01'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('active-room-card-SALA-03'),
    ).not.toBeInTheDocument();

    // Emit session:started -> refreshes overview and shows SALA-03 card
    act(() => {
      socketListeners['session:started']?.forEach((cb) => {
        cb({
          session: {
            id: 'session-104',
            roomId: 'SALA-03',
            classCode: '1B',
            subject: 'Biologia',
          },
        });
      });
    });

    expect(
      await screen.findByTestId('active-room-card-SALA-03'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Prof\. Helena Costa/i)).toBeInTheDocument();

    // Emit session:ended for SALA-02 -> removes SALA-02 card and updates table
    act(() => {
      socketListeners['session:ended']?.forEach((cb) => {
        cb({
          session: {
            id: 'session-102',
            roomId: 'SALA-02',
            classCode: '2B',
            subject: 'História',
          },
        });
      });
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId('active-room-card-SALA-02'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Pedro A.')).not.toBeInTheDocument();
    });
  });
});
