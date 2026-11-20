import { TerminalFooter } from '@client/components/terminal/TerminalFooter';
import { TerminalNavbar } from '@client/components/terminal/TerminalNavbar';
import { TerminalPage } from '@client/pages/TerminalPage';
import { api } from '@client/services/api';
import type { ClassSessionDTO, MovementDTO, UserDTO } from '@shared/dtos';
import {
  AlertLevel,
  MovementStatus,
  SessionStatus,
  UserRole,
} from '@shared/enums';
import { render, screen } from '@testing-library/react';
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
    enqueueWaiting: vi.fn(),
    cancelQueue: vi.fn(),
    claimQueueSlot: vi.fn(),
    teacherOverrideExit: vi.fn(),
  },
}));

describe('Kiosk Terminal: Minimalist Navbar & Footer Components (Ticket #37)', () => {
  const teacherUser: UserDTO = {
    id: 'teacher-1',
    name: 'Prof. Carlos Eduardo',
    email: 'carlos.eduardo@linsdorego.edu.br',
    role: UserRole.TEACHER,
  };

  const activeSessionDTO: ClassSessionDTO = {
    id: 'session-101',
    teacherId: teacherUser.id,
    teacherName: teacherUser.name,
    roomId: 'SALA-01',
    classCode: '2A',
    subject: 'História',
    status: SessionStatus.ACTIVE,
    startedAt: new Date(Date.now() - 60_000).toISOString(),
    plannedDurationMinutes: 50,
    defaultTimeLimitMinutes: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TerminalNavbar Unit Behavior', () => {
    it('renders brand logo ("InAndOut"), active room/class info, and teacher name', () => {
      render(
        <TerminalNavbar
          user={teacherUser}
          roomId="SALA-01"
          activeSession={activeSessionDTO}
          isOccupied={false}
          isLocked={false}
          onLock={vi.fn()}
          onLogout={vi.fn()}
        />,
      );

      // 1. Institutional Brand Logo
      expect(screen.getByText('InAndOut')).toBeInTheDocument();

      // 2. Room & Active Class info
      expect(screen.getByText(/SALA-01/i)).toBeInTheDocument();
      expect(screen.getByText(/Turma 2A/i)).toBeInTheDocument();
      expect(screen.getByText(/História/i)).toBeInTheDocument();
      expect(screen.getByText(/Carlos Eduardo/i)).toBeInTheDocument();
    });

    it('triggers quick 1-touch screen lock when clicking the lock button', async () => {
      const user = userEvent.setup();
      const handleLock = vi.fn();

      render(
        <TerminalNavbar
          user={teacherUser}
          roomId="SALA-01"
          activeSession={activeSessionDTO}
          isOccupied={false}
          isLocked={false}
          onLock={handleLock}
          onLogout={vi.fn()}
        />,
      );

      const menuTrigger = screen.getByRole('button', {
        name: /Ações do Professor/i,
      });
      await user.click(menuTrigger);

      const lockBtn = await screen.findByRole('menuitem', {
        name: /Bloquear Terminal/i,
      });
      await user.click(lockBtn);

      expect(handleLock).toHaveBeenCalledTimes(1);
    });

    it('keeps critical teacher actions in a discreet dropdown menu and executes logout', async () => {
      const user = userEvent.setup();
      const handleLogout = vi.fn();

      render(
        <TerminalNavbar
          user={teacherUser}
          roomId="SALA-01"
          activeSession={activeSessionDTO}
          isOccupied={false}
          isLocked={false}
          onLock={vi.fn()}
          onLogout={handleLogout}
        />,
      );

      // Critical actions should not be accessible before opening menu
      expect(
        screen.queryByRole('menuitem', { name: /Sair \/ Logout/i }),
      ).not.toBeInTheDocument();

      // Open dropdown menu
      const menuTrigger = screen.getByRole('button', {
        name: /Ações do Professor/i,
      });
      await user.click(menuTrigger);

      // Now options are visible
      const logoutBtn = screen.getByRole('menuitem', {
        name: /Sair \/ Logout/i,
      });
      expect(logoutBtn).toBeInTheDocument();

      await user.click(logoutBtn);
      expect(handleLogout).toHaveBeenCalledTimes(1);
    });

    it('allows ending class session from discreet menu after confirmation', async () => {
      const user = userEvent.setup();
      const handleEndSession = vi.fn().mockResolvedValue({});

      render(
        <TerminalNavbar
          user={teacherUser}
          roomId="SALA-01"
          activeSession={activeSessionDTO}
          isOccupied={false}
          isLocked={false}
          onLock={vi.fn()}
          onEndSession={handleEndSession}
          onLogout={vi.fn()}
        />,
      );

      // Open dropdown
      const menuTrigger = screen.getByRole('button', {
        name: /Ações do Professor/i,
      });
      await user.click(menuTrigger);

      const endSessionBtn = screen.getByRole('menuitem', {
        name: /Encerrar Sessão de Aula/i,
      });
      await user.click(endSessionBtn);

      // Confirmation dialog opens
      expect(
        await screen.findByRole('heading', {
          name: /Confirmar Encerramento de Aula/i,
        }),
      ).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', {
        name: /Confirmar Encerramento/i,
      });
      await user.click(confirmBtn);

      expect(handleEndSession).toHaveBeenCalledTimes(1);
    });

    it('disables "Trocar de Sala" in the discreet menu while a session is ACTIVE', async () => {
      const user = userEvent.setup();
      const handleChangeRoom = vi.fn();

      render(
        <TerminalNavbar
          user={teacherUser}
          roomId="SALA-01"
          activeSession={activeSessionDTO}
          isOccupied={false}
          isLocked={false}
          onLock={vi.fn()}
          onChangeRoom={handleChangeRoom}
          onLogout={vi.fn()}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: /Ações do Professor/i }),
      );
      const menuItem = await screen.findByRole('menuitem', {
        name: /Trocar de Sala/i,
      });
      expect(menuItem).toHaveAttribute('aria-disabled', 'true');
      expect(menuItem).toHaveAttribute(
        'title',
        expect.stringMatching(/encerre/i),
      );
      expect(handleChangeRoom).not.toHaveBeenCalled();
    });

    it('enables "Trocar de Sala" in the discreet menu when no session is active', async () => {
      const user = userEvent.setup();
      const handleChangeRoom = vi.fn();

      render(
        <TerminalNavbar
          user={teacherUser}
          roomId="SALA-01"
          activeSession={null}
          isOccupied={false}
          isLocked={false}
          onLock={vi.fn()}
          onChangeRoom={handleChangeRoom}
          onLogout={vi.fn()}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: /Ações do Professor/i }),
      );
      const menuItem = await screen.findByRole('menuitem', {
        name: /Trocar de Sala/i,
      });
      expect(menuItem).not.toHaveAttribute('aria-disabled', 'true');
      await user.click(menuItem);

      expect(handleChangeRoom).toHaveBeenCalledTimes(1);
    });
  });

  describe('TerminalFooter Unit Behavior', () => {
    it('renders clean institutional copyright, academic year, and version without marketing distractions', () => {
      render(
        <TerminalFooter
          institutionName="Escola Estadual José Lins do Rego"
          academicYear={2026}
          version="1.0.0"
        />,
      );

      expect(
        screen.getByText(/Escola Estadual José Lins do Rego/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Ano Letivo: 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/v1\.0\.0/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Todos os direitos reservados/i),
      ).toBeInTheDocument();

      // Ensure no social media / marketing elements
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('TerminalPage Full Integration', () => {
    it('integrates TerminalNavbar and TerminalFooter dynamically in the kiosk layout', async () => {
      const activeMovement: MovementDTO = {
        id: 'mov-1',
        sessionId: 'session-101',
        studentId: 'student-1',
        studentRa: '2024101',
        studentFullName: 'Lucas Silva',
        studentPublicName: 'Lucas S.',
        classCode: '2A',
        subject: 'História',
        status: MovementStatus.IN_TRANSIT,
        alertLevel: AlertLevel.GREEN,
        startedAt: new Date().toISOString(),
        allowedLimitMinutes: 10,
        isEmergency: false,
        isGuest: false,
      };

      vi.mocked(api.getActiveSession).mockResolvedValueOnce({
        session: activeSessionDTO,
        activeMovements: [activeMovement],
        queue: [],
      });

      render(
        <TerminalPage
          user={teacherUser}
          token="jwt-test-token"
          roomId="SALA-01"
          onVerifyPin={vi.fn()}
          onLogout={vi.fn()}
        />,
      );

      // Navbar brand & Room/Class
      const brandElements = await screen.findAllByText('InAndOut');
      expect(brandElements.length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText(/Turma 2A/i).length).toBeGreaterThanOrEqual(1);

      // Active movement student name is visible in kiosk body
      expect(screen.getByText('Lucas S.')).toBeInTheDocument();

      // Minimalist Footer is present
      expect(
        screen.getByText(/Escola Estadual José Lins do Rego/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Terminal Kiosk/i)).toBeInTheDocument();
    });
  });
});
