import { App } from '@client/App';
import { api } from '@client/services/api';
import type { ClassSessionDTO, RoomDTO, UserDTO } from '@shared/dtos';
import { SessionStatus, UserRole } from '@shared/enums';
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
});
