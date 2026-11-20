import { App } from '@client/App';
import { api } from '@client/services/api';
import type { UserDTO } from '@shared/dtos';
import { UserRole } from '@shared/enums';
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
    getCoordinationActiveMovements: vi.fn(),
    getOverviewAnalytics: vi.fn(),
    getStudentHistory: vi.fn(),
    exportAnalytics: vi.fn(),
    resolveMovement: vi.fn(),
  },
}));

describe('Frontend Seam: Central Routing & Role Guards (Ticket #39)', () => {
  const teacherUser: UserDTO = {
    id: 'teacher-1',
    name: 'Prof. Carlos Eduardo',
    email: 'prof@linsdorego.edu.br',
    role: UserRole.TEACHER,
  };

  const coordUser: UserDTO = {
    id: 'coord-1',
    name: 'Coord. Mariana Alves',
    email: 'coord@linsdorego.edu.br',
    role: UserRole.COORDINATOR,
  };

  const adminUser: UserDTO = {
    id: 'admin-1',
    name: 'Admin Geral',
    email: 'admin@linsdorego.edu.br',
    role: UserRole.ADMIN,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(api.getActiveSession).mockResolvedValue({
      session: null,
      activeMovements: [],
      queue: [],
    });
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValue({
      movements: [],
    });
  });

  describe('Unauthenticated Redirections', () => {
    it('redirects unauthenticated user accessing /terminal to /login', async () => {
      render(<App initialEntries={['/terminal']} />);

      expect(
        await screen.findByRole('heading', { name: /Acesso do Professor/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Entrar no Terminal/i }),
      ).toBeInTheDocument();
    });

    it('redirects unauthenticated user accessing /coordination to /login', async () => {
      render(<App initialEntries={['/coordination']} />);

      expect(
        await screen.findByRole('heading', { name: /Acesso do Professor/i }),
      ).toBeInTheDocument();
    });

    it('redirects unauthenticated user accessing / to /login', async () => {
      render(<App initialEntries={['/']} />);

      expect(
        await screen.findByRole('heading', { name: /Acesso do Professor/i }),
      ).toBeInTheDocument();
    });

    it('redirects unauthenticated user on unknown 404 route to /login via root', async () => {
      render(<App initialEntries={['/rota-desconhecida-404']} />);

      expect(
        await screen.findByRole('heading', { name: /Acesso do Professor/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Teacher Role Protections', () => {
    beforeEach(() => {
      localStorage.setItem('inandout_token', 'valid-teacher-token');
      localStorage.setItem('inandout_user', JSON.stringify(teacherUser));
    });

    it('allows teacher to access /terminal when authenticated', async () => {
      render(<App initialEntries={['/terminal']} />);

      expect(
        await screen.findByRole('heading', {
          name: /Nenhuma aula ativa no momento/i,
        }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Prof\. Carlos Eduardo/i)).toBeInTheDocument();
    });

    it('redirects teacher attempting to access /coordination to /terminal', async () => {
      render(<App initialEntries={['/coordination']} />);

      expect(
        await screen.findByRole('heading', {
          name: /Nenhuma aula ativa no momento/i,
        }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Prof\. Carlos Eduardo/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/Painel da Coordenação/i),
      ).not.toBeInTheDocument();
    });

    it('redirects authenticated teacher on / to /terminal', async () => {
      render(<App initialEntries={['/']} />);

      expect(
        await screen.findByRole('heading', {
          name: /Nenhuma aula ativa no momento/i,
        }),
      ).toBeInTheDocument();
    });

    it('redirects authenticated teacher on /login to /terminal', async () => {
      render(<App initialEntries={['/login']} />);

      expect(
        await screen.findByRole('heading', {
          name: /Nenhuma aula ativa no momento/i,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('Coordinator & Admin Role Protections', () => {
    it('allows coordinator to access /coordination when authenticated', async () => {
      localStorage.setItem('inandout_token', 'valid-coord-token');
      localStorage.setItem('inandout_user', JSON.stringify(coordUser));

      render(<App initialEntries={['/coordination']} />);

      expect(
        await screen.findByText(/Painel da Coordenação/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Saídas Ativas em Tempo Real'),
      ).toBeInTheDocument();
    });

    it('allows admin to access /coordination when authenticated', async () => {
      localStorage.setItem('inandout_token', 'valid-admin-token');
      localStorage.setItem('inandout_user', JSON.stringify(adminUser));

      render(<App initialEntries={['/coordination']} />);

      expect(
        await screen.findByText(/Painel da Coordenação/i),
      ).toBeInTheDocument();
    });

    it('redirects coordinator attempting to access /terminal to /coordination', async () => {
      localStorage.setItem('inandout_token', 'valid-coord-token');
      localStorage.setItem('inandout_user', JSON.stringify(coordUser));

      render(<App initialEntries={['/terminal']} />);

      expect(
        await screen.findByText(/Painel da Coordenação/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /Iniciar Nova Sessão de Aula/i }),
      ).not.toBeInTheDocument();
    });

    it('redirects authenticated coordinator on / to /coordination', async () => {
      localStorage.setItem('inandout_token', 'valid-coord-token');
      localStorage.setItem('inandout_user', JSON.stringify(coordUser));

      render(<App initialEntries={['/']} />);

      expect(
        await screen.findByText(/Painel da Coordenação/i),
      ).toBeInTheDocument();
    });

    it('redirects authenticated coordinator on /login to /coordination', async () => {
      localStorage.setItem('inandout_token', 'valid-coord-token');
      localStorage.setItem('inandout_user', JSON.stringify(coordUser));

      render(<App initialEntries={['/login']} />);

      expect(
        await screen.findByText(/Painel da Coordenação/i),
      ).toBeInTheDocument();
    });
  });

  describe('Session Restoration & Logout', () => {
    it('restores teacher session from localStorage automatically', async () => {
      localStorage.setItem('inandout_token', 'restored-token');
      localStorage.setItem('inandout_user', JSON.stringify(teacherUser));

      render(<App initialEntries={['/terminal']} />);

      expect(
        await screen.findByText(/Prof\. Carlos Eduardo/i),
      ).toBeInTheDocument();
    });

    it('logout from Terminal clears localStorage and navigates to /login', async () => {
      const user = userEvent.setup();
      localStorage.setItem('inandout_token', 'teacher-token');
      localStorage.setItem('inandout_user', JSON.stringify(teacherUser));

      render(<App initialEntries={['/terminal']} />);

      expect(
        await screen.findByText(/Prof\. Carlos Eduardo/i),
      ).toBeInTheDocument();

      // Open teacher menu in navbar
      const menuBtn = screen.getByRole('button', {
        name: /Ações do Professor/i,
      });
      await user.click(menuBtn);

      // Click logout menuitem
      const logoutBtn = screen.getByRole('menuitem', {
        name: /Sair \/ Logout/i,
      });
      await user.click(logoutBtn);

      // Verify localStorage is cleared
      expect(localStorage.getItem('inandout_token')).toBeNull();
      expect(localStorage.getItem('inandout_user')).toBeNull();

      // Verify redirected to /login
      expect(
        await screen.findByRole('heading', { name: /Acesso do Professor/i }),
      ).toBeInTheDocument();
    });

    it('logout from Coordination clears localStorage and navigates to /login', async () => {
      const user = userEvent.setup();
      localStorage.setItem('inandout_token', 'coord-token');
      localStorage.setItem('inandout_user', JSON.stringify(coordUser));

      render(<App initialEntries={['/coordination']} />);

      expect(
        await screen.findByText(/Painel da Coordenação/i),
      ).toBeInTheDocument();

      // Click logout button in coordination header dropdown
      const profileTrigger = screen.getByTestId(
        'coordinator-profile-dropdown-trigger',
      );
      await user.click(profileTrigger);
      const logoutBtn = screen.getByRole('menuitem', { name: /Sair/i });
      await user.click(logoutBtn);

      // Verify localStorage is cleared
      expect(localStorage.getItem('inandout_token')).toBeNull();
      expect(localStorage.getItem('inandout_user')).toBeNull();

      // Verify redirected to /login
      expect(
        await screen.findByRole('heading', { name: /Acesso do Professor/i }),
      ).toBeInTheDocument();
    });
  });
});
