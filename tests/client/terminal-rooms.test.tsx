import { App } from '@client/App';
import { api } from '@client/services/api';
import type {
  ClassSessionDTO,
  MovementDTO,
  RoomDTO,
  UserDTO,
  WaitingQueueDTO,
} from '@shared/dtos';
import {
  AlertLevel,
  MovementStatus,
  QueueEntryStatus,
  SessionStatus,
  UserRole,
} from '@shared/enums';
import { SOCKET_EVENTS } from '@shared/events';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSocket, socketHandlers, triggerSocketEvent } = vi.hoisted(() => {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();
  const socket = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)?.add(handler);
      return socket;
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.get(event)?.delete(handler);
      return socket;
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
  return {
    mockSocket: socket,
    socketHandlers: handlers,
    triggerSocketEvent: (event: string, payload: unknown) => {
      const listeners = handlers.get(event);
      if (listeners) {
        for (const listener of listeners) {
          listener(payload);
        }
      }
    },
  };
});

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
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
    listRooms: vi.fn(),
  },
}));

describe('Frontend Seam: Multi-Room Terminal Routing, Room Selection & Idle Waiting Screen (Ticket #49)', () => {
  const teacherUser: UserDTO = {
    id: 'teacher-1',
    name: 'Prof. Carlos Eduardo',
    email: 'prof@linsdorego.edu.br',
    role: UserRole.TEACHER,
  };

  const activeRooms: RoomDTO[] = [
    {
      id: 'room-1',
      code: 'SALA-01',
      name: 'Sala 01',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'room-2',
      code: 'SALA-02',
      name: 'Sala 02',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'room-3',
      code: 'LAB-01',
      name: 'Laboratório 01',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers.clear();
    localStorage.clear();
    localStorage.setItem('inandout_token', 'valid-teacher-token');
    localStorage.setItem('inandout_user', JSON.stringify(teacherUser));

    vi.mocked(api.getActiveSession).mockResolvedValue({
      session: null,
      activeMovements: [],
      queue: [],
    });
    vi.mocked(api.listRooms).mockResolvedValue({
      rooms: activeRooms,
    });
  });

  describe('Dynamic Routing (/terminal/:roomCode & /terminal redirect)', () => {
    it('loads the terminal bound to the normalized roomCode from /terminal/:roomCode', async () => {
      render(<App initialEntries={['/terminal/lab-01']} />);

      await waitFor(() => {
        expect(api.getActiveSession).toHaveBeenCalledWith(
          'LAB-01',
          'valid-teacher-token',
        );
      });

      expect(screen.getAllByText('LAB-01').length).toBeGreaterThanOrEqual(1);
    });

    it('redirects /terminal to /terminal/<savedCode> when localStorage has a saved room', async () => {
      localStorage.setItem('inandout_room_code', 'SALA-02');

      render(<App initialEntries={['/terminal']} />);

      await waitFor(() => {
        expect(api.getActiveSession).toHaveBeenCalledWith(
          'SALA-02',
          'valid-teacher-token',
        );
      });

      expect(screen.getAllByText('SALA-02').length).toBeGreaterThanOrEqual(1);
      expect(api.listRooms).not.toHaveBeenCalled();
    });

    it('opens the room selection modal on /terminal when no saved room exists, lists active rooms, persists selection in localStorage, and navigates to /terminal/:roomCode', async () => {
      const user = userEvent.setup();

      render(<App initialEntries={['/terminal']} />);

      await waitFor(() => {
        expect(api.listRooms).toHaveBeenCalledWith('valid-teacher-token', {
          onlyActive: true,
        });
      });

      expect(
        await screen.findByRole('heading', {
          name: /Selecionar Sala de Aula/i,
        }),
      ).toBeInTheDocument();
      expect(screen.getByText('Sala 01')).toBeInTheDocument();
      expect(screen.getByText('Sala 02')).toBeInTheDocument();
      expect(screen.getByText('Laboratório 01')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Laboratório 01/i }));

      expect(localStorage.getItem('inandout_room_code')).toBe('LAB-01');

      await waitFor(() => {
        expect(api.getActiveSession).toHaveBeenCalledWith(
          'LAB-01',
          'valid-teacher-token',
        );
      });

      expect(screen.getAllByText('LAB-01').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Idle Waiting Screen, Blocked RA Keypad, Start Session Modal & Change Room', () => {
    it('renders idle waiting screen with room badge, "Iniciar Aula" and "Trocar de Sala" buttons when no session is active', async () => {
      render(<App initialEntries={['/terminal/SALA-02']} />);

      expect(
        await screen.findByRole('heading', {
          name: /Nenhuma aula ativa no momento/i,
        }),
      ).toBeInTheDocument();

      const roomBadge = screen.getByTestId('idle-room-badge');
      expect(roomBadge).toHaveTextContent('SALA-02');

      expect(
        screen.getByRole('button', { name: /Iniciar Aula/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Trocar de Sala/i }),
      ).toBeInTheDocument();
    });

    it('blocks student RA submission on the idle screen and displays explanatory pt-BR feedback without calling movement APIs', async () => {
      const user = userEvent.setup();

      render(<App initialEntries={['/terminal/SALA-02']} />);

      expect(
        await screen.findByRole('heading', {
          name: /Nenhuma aula ativa no momento/i,
        }),
      ).toBeInTheDocument();

      const raInput = screen.getByLabelText(/RA do Estudante/i);
      await user.type(raInput, '2024101');
      await user.click(
        screen.getByRole('button', { name: /Registrar Saída/i }),
      );

      expect(api.requestExit).not.toHaveBeenCalled();
      expect(api.registerReturn).not.toHaveBeenCalled();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/não há aula ativa/i);
    });

    it('opens the Start Session modal when clicking "Iniciar Aula" and starts the session bound to the route roomId', async () => {
      const user = userEvent.setup();

      const startedSession: ClassSessionDTO = {
        id: 'session-sala-02',
        teacherId: teacherUser.id,
        teacherName: teacherUser.name,
        roomId: 'SALA-02',
        classCode: '3A',
        subject: 'Física',
        status: SessionStatus.ACTIVE,
        startedAt: new Date().toISOString(),
        plannedDurationMinutes: 50,
        defaultTimeLimitMinutes: 10,
      };

      vi.mocked(api.startSession).mockResolvedValueOnce({
        session: startedSession,
      });

      render(<App initialEntries={['/terminal/SALA-02']} />);

      await user.click(
        await screen.findByRole('button', { name: /Iniciar Aula/i }),
      );

      expect(
        await screen.findByRole('heading', {
          name: /Iniciar Nova Sessão de Aula/i,
        }),
      ).toBeInTheDocument();

      await user.click(screen.getByLabelText(/Turma/i));
      await user.click(await screen.findByRole('option', { name: '3A' }));

      await user.click(screen.getByLabelText(/Disciplina/i));
      await user.click(await screen.findByRole('option', { name: 'Física' }));

      await user.click(
        screen.getByRole('button', { name: /Iniciar Sessão de Aula/i }),
      );

      await waitFor(() => {
        expect(api.startSession).toHaveBeenCalledWith(
          expect.objectContaining({
            roomId: 'SALA-02',
            classCode: '3A',
            subject: 'Física',
          }),
          'valid-teacher-token',
        );
      });

      expect(await screen.findByText(/Aula em Andamento/i)).toBeInTheDocument();
    });

    it('opens the room selection modal when clicking "Trocar de Sala", updates localStorage, and navigates to the new room route', async () => {
      const user = userEvent.setup();
      localStorage.setItem('inandout_room_code', 'SALA-02');

      render(<App initialEntries={['/terminal/SALA-02']} />);

      await user.click(
        await screen.findByRole('button', { name: /Trocar de Sala/i }),
      );

      expect(
        await screen.findByRole('heading', {
          name: /Selecionar Sala de Aula/i,
        }),
      ).toBeInTheDocument();

      await user.click(
        await screen.findByRole('button', { name: /Laboratório 01/i }),
      );

      expect(localStorage.getItem('inandout_room_code')).toBe('LAB-01');

      await waitFor(() => {
        expect(api.getActiveSession).toHaveBeenCalledWith(
          'LAB-01',
          'valid-teacher-token',
        );
      });

      expect(screen.getByTestId('idle-room-badge')).toHaveTextContent('LAB-01');
    });
  });

  describe('In-Session Room Switch Lock (Ticket #50)', () => {
    it('blocks room switching while a class session is ACTIVE in the room', async () => {
      const activeSession: ClassSessionDTO = {
        id: 'session-active-sala-02',
        teacherId: teacherUser.id,
        teacherName: teacherUser.name,
        roomId: 'SALA-02',
        classCode: '3A',
        subject: 'Física',
        status: SessionStatus.ACTIVE,
        startedAt: new Date(Date.now() - 120_000).toISOString(),
        plannedDurationMinutes: 50,
        defaultTimeLimitMinutes: 10,
      };

      vi.mocked(api.getActiveSession).mockResolvedValueOnce({
        session: activeSession,
        activeMovements: [],
        queue: [],
      });

      render(<App initialEntries={['/terminal/SALA-02']} />);

      expect(await screen.findByText(/Aula em Andamento/i)).toBeInTheDocument();

      const changeRoomBtn = screen.getByRole('button', {
        name: /Trocar de Sala/i,
      });
      expect(changeRoomBtn).toBeDisabled();
      expect(changeRoomBtn).toHaveAttribute(
        'title',
        expect.stringMatching(/encerre/i),
      );
      expect(
        screen.queryByRole('heading', { name: /Selecionar Sala de Aula/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('WebSocket Room Channel Subscription & Remote Session Lifecycle (Ticket #50)', () => {
    it('subscribes to room:<roomCode> and session:<sessionId> channels and leaves both on cleanup', async () => {
      const activeSession: ClassSessionDTO = {
        id: 'session-socket-sala-02',
        teacherId: teacherUser.id,
        teacherName: teacherUser.name,
        roomId: 'SALA-02',
        classCode: '2B',
        subject: 'Química',
        status: SessionStatus.ACTIVE,
        startedAt: new Date(Date.now() - 60_000).toISOString(),
        plannedDurationMinutes: 50,
        defaultTimeLimitMinutes: 10,
      };

      vi.mocked(api.getActiveSession).mockResolvedValueOnce({
        session: activeSession,
        activeMovements: [],
        queue: [],
      });

      const { unmount } = render(
        <App initialEntries={['/terminal/SALA-02']} />,
      );

      expect(await screen.findByText(/Aula em Andamento/i)).toBeInTheDocument();

      expect(mockSocket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.JOIN_ROOM, {
        roomCode: 'SALA-02',
      });
      expect(mockSocket.emit).toHaveBeenCalledWith(
        SOCKET_EVENTS.JOIN_SESSION,
        'session-socket-sala-02',
      );

      unmount();

      expect(mockSocket.emit).toHaveBeenCalledWith(
        SOCKET_EVENTS.LEAVE_SESSION,
        'session-socket-sala-02',
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.LEAVE_ROOM, {
        roomCode: 'SALA-02',
      });
    });

    it('subscribes to room:<roomCode> while idle, reacts to SESSION_STARTED for its room, and ignores events from other rooms', async () => {
      render(<App initialEntries={['/terminal/SALA-02']} />);

      expect(
        await screen.findByRole('heading', {
          name: /Nenhuma aula ativa no momento/i,
        }),
      ).toBeInTheDocument();

      expect(mockSocket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.JOIN_ROOM, {
        roomCode: 'SALA-02',
      });

      // Event for another room must be ignored
      act(() => {
        triggerSocketEvent(SOCKET_EVENTS.SESSION_STARTED, {
          session: {
            id: 'session-other-room',
            teacherId: 'teacher-2',
            teacherName: 'Prof. Maria',
            roomId: 'SALA-01',
            classCode: '1A',
            subject: 'História',
            status: SessionStatus.ACTIVE,
            startedAt: new Date().toISOString(),
            plannedDurationMinutes: 50,
            defaultTimeLimitMinutes: 10,
          },
        });
      });

      expect(
        screen.getByRole('heading', {
          name: /Nenhuma aula ativa no momento/i,
        }),
      ).toBeInTheDocument();

      // Event for SALA-02 activates the terminal and locks room switching
      act(() => {
        triggerSocketEvent(SOCKET_EVENTS.SESSION_STARTED, {
          session: {
            id: 'session-remote-sala-02',
            teacherId: teacherUser.id,
            teacherName: teacherUser.name,
            roomId: 'SALA-02',
            classCode: '3B',
            subject: 'Biologia',
            status: SessionStatus.ACTIVE,
            startedAt: new Date().toISOString(),
            plannedDurationMinutes: 50,
            defaultTimeLimitMinutes: 10,
          },
        });
      });

      expect(await screen.findByText(/Aula em Andamento/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Turma 3B/i).length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByRole('button', { name: /Trocar de Sala/i }),
      ).toBeDisabled();
    });

    it('reacts to remote SESSION_ENDED for its room cleanly and ignores SESSION_ENDED from other rooms', async () => {
      const activeSession: ClassSessionDTO = {
        id: 'session-remote-end',
        teacherId: teacherUser.id,
        teacherName: teacherUser.name,
        roomId: 'SALA-02',
        classCode: '3A',
        subject: 'Física',
        status: SessionStatus.ACTIVE,
        startedAt: new Date(Date.now() - 300_000).toISOString(),
        plannedDurationMinutes: 50,
        defaultTimeLimitMinutes: 10,
      };

      const openMovement: MovementDTO = {
        id: 'mov-open-remote',
        sessionId: activeSession.id,
        studentId: 'student-1',
        studentRa: '2024101',
        studentFullName: 'Lucas Silva',
        studentPublicName: 'Lucas S.',
        classCode: '3A',
        subject: 'Física',
        roomId: 'SALA-02',
        status: MovementStatus.IN_TRANSIT,
        alertLevel: AlertLevel.GREEN,
        startedAt: new Date(Date.now() - 120_000).toISOString(),
        allowedLimitMinutes: 10,
        isEmergency: false,
        isGuest: false,
      };

      vi.mocked(api.getActiveSession).mockResolvedValueOnce({
        session: activeSession,
        activeMovements: [openMovement],
        queue: [],
      });

      render(<App initialEntries={['/terminal/SALA-02']} />);

      expect(await screen.findByText('Lucas S.')).toBeInTheDocument();

      // SESSION_ENDED for another room must be ignored
      act(() => {
        triggerSocketEvent(SOCKET_EVENTS.SESSION_ENDED, {
          session: {
            ...activeSession,
            id: 'session-other',
            roomId: 'SALA-01',
            status: SessionStatus.ENDED,
          },
          metrics: {
            totalExits: 1,
            inTransitUnresolvedCount: 0,
            elapsedMinutes: 50,
          },
          inTransitMovements: [],
        });
      });

      expect(screen.getByText('Lucas S.')).toBeInTheDocument();

      // SESSION_ENDED for SALA-02 returns cleanly to idle state
      act(() => {
        triggerSocketEvent(SOCKET_EVENTS.SESSION_ENDED, {
          session: {
            ...activeSession,
            status: SessionStatus.ENDED,
            endedAt: new Date().toISOString(),
          },
          metrics: {
            totalExits: 1,
            inTransitUnresolvedCount: 1,
            elapsedMinutes: 5,
          },
          inTransitMovements: [
            { ...openMovement, status: MovementStatus.IN_TRANSIT_UNRESOLVED },
          ],
        });
      });

      expect(
        await screen.findByRole('heading', {
          name: /Nenhuma aula ativa no momento/i,
        }),
      ).toBeInTheDocument();
      expect(screen.queryByText('Lucas S.')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Trocar de Sala/i }),
      ).toBeEnabled();
    });
  });

  describe('Clean Session End Transition with Open Movements (Ticket #50 / ADR 0002)', () => {
    it('clears active movements and queue on session end, shows inTransitUnresolvedCount summary, returns to idle state, and re-enables "Trocar de Sala" to move to the next room', async () => {
      const user = userEvent.setup();

      const activeSession: ClassSessionDTO = {
        id: 'session-end-unresolved',
        teacherId: teacherUser.id,
        teacherName: teacherUser.name,
        roomId: 'SALA-02',
        classCode: '3A',
        subject: 'Física',
        status: SessionStatus.ACTIVE,
        startedAt: new Date(Date.now() - 1_800_000).toISOString(),
        plannedDurationMinutes: 50,
        defaultTimeLimitMinutes: 10,
      };

      const openMovement: MovementDTO = {
        id: 'mov-open-1',
        sessionId: activeSession.id,
        studentId: 'student-1',
        studentRa: '2024101',
        studentFullName: 'Lucas Silva',
        studentPublicName: 'Lucas S.',
        classCode: '3A',
        subject: 'Física',
        roomId: 'SALA-02',
        status: MovementStatus.IN_TRANSIT,
        alertLevel: AlertLevel.GREEN,
        startedAt: new Date(Date.now() - 240_000).toISOString(),
        allowedLimitMinutes: 10,
        isEmergency: false,
        isGuest: false,
      };

      const waitingEntry: WaitingQueueDTO = {
        id: 'queue-1',
        sessionId: activeSession.id,
        studentRa: '2024102',
        studentFullName: 'Marina Pereira',
        studentPublicName: 'Marina P.',
        position: 1,
        status: QueueEntryStatus.WAITING,
        requestedAt: new Date(Date.now() - 120_000).toISOString(),
      };

      vi.mocked(api.getActiveSession).mockResolvedValueOnce({
        session: activeSession,
        activeMovements: [openMovement],
        queue: [waitingEntry],
      });

      vi.mocked(api.endSession).mockResolvedValueOnce({
        session: {
          ...activeSession,
          status: SessionStatus.ENDED,
          endedAt: new Date().toISOString(),
        },
        metrics: {
          totalExits: 2,
          inTransitUnresolvedCount: 1,
          elapsedMinutes: 30,
        },
        inTransitMovements: [
          {
            ...openMovement,
            status: MovementStatus.IN_TRANSIT_UNRESOLVED,
          },
        ],
      });

      render(<App initialEntries={['/terminal/SALA-02']} />);

      // Verify active session, open movement, waiting queue, and locked room switch
      expect(await screen.findByText('Lucas S.')).toBeInTheDocument();
      expect(screen.getAllByText('Marina P.').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('concurrency-badge')).toHaveTextContent(
        'Em Atendimento',
      );
      expect(
        screen.getByRole('button', { name: /Trocar de Sala/i }),
      ).toBeDisabled();

      // End the active session
      await user.click(screen.getByRole('button', { name: /Encerrar Aula/i }));
      await user.click(
        await screen.findByRole('button', { name: /Confirmar Encerramento/i }),
      );

      await waitFor(() => {
        expect(api.endSession).toHaveBeenCalledWith(
          { sessionId: 'session-end-unresolved' },
          'valid-teacher-token',
        );
      });

      // Terminal returns cleanly to idle state for SALA-02 with no remnants
      expect(
        await screen.findByRole('heading', {
          name: /Nenhuma aula ativa no momento/i,
        }),
      ).toBeInTheDocument();
      expect(screen.getByTestId('idle-room-badge')).toHaveTextContent(
        'SALA-02',
      );
      expect(screen.queryByText('Lucas S.')).not.toBeInTheDocument();
      expect(screen.queryByText('Marina P.')).not.toBeInTheDocument();
      expect(screen.getByTestId('concurrency-badge')).toHaveTextContent(
        'Sala Liberada',
      );

      // Summary banner includes inTransitUnresolvedCount info
      const statusBanner = screen.getByRole('status');
      expect(statusBanner).toHaveTextContent(/Sessão de aula encerrada/i);
      expect(statusBanner).toHaveTextContent(/1 saída\(s\) em trânsito/i);
      expect(statusBanner).toHaveTextContent(/Coordenação/i);

      // "Trocar de Sala" is immediately re-enabled and allows moving to LAB-01
      const changeRoomBtn = screen.getByRole('button', {
        name: /Trocar de Sala/i,
      });
      expect(changeRoomBtn).toBeEnabled();

      await user.click(changeRoomBtn);
      await user.click(
        await screen.findByRole('button', { name: /Laboratório 01/i }),
      );

      await waitFor(() => {
        expect(api.getActiveSession).toHaveBeenCalledWith(
          'LAB-01',
          'valid-teacher-token',
        );
      });
      expect(screen.getByTestId('idle-room-badge')).toHaveTextContent('LAB-01');
    });
  });
});
