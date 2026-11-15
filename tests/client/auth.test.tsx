import { App } from '@client/App';
import { api } from '@client/services/api';
import { UserRole } from '@shared/enums';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@client/services/api', () => ({
  api: {
    login: vi.fn(),
    verifyPin: vi.fn(),
    refreshToken: vi.fn(),
  },
}));

describe('Frontend Seam: LoginPage & Shadcn InputOTP Classroom Terminal Unlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('allows the teacher to authenticate on LoginPage, lock the classroom terminal, and unlock it via the 4-digit InputOTP component', async () => {
    const user = userEvent.setup();

    vi.mocked(api.login).mockResolvedValueOnce({
      token: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token',
      user: {
        id: 'teacher-1',
        name: 'Prof. Carlos Eduardo',
        email: 'prof@linsdorego.edu.br',
        role: UserRole.TEACHER,
      },
    });

    render(<App />);

    // 1. Login screen is displayed initially
    expect(
      screen.getByRole('heading', { name: /Acesso do Professor/i }),
    ).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/E-mail Institucional/i);
    const passwordInput = screen.getByLabelText(/Senha/i);

    await user.clear(emailInput);
    await user.type(emailInput, 'prof@linsdorego.edu.br');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'senha123');

    await user.click(
      screen.getByRole('button', { name: /Entrar no Terminal/i }),
    );

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith({
        email: 'prof@linsdorego.edu.br',
        password: 'senha123',
      });
    });

    // 2. Classroom Terminal is now unlocked and displays teacher's name
    expect(
      await screen.findByText(/Prof\. Carlos Eduardo/i),
    ).toBeInTheDocument();

    // 3. Teacher locks the terminal between classes
    const lockBtn = screen.getByRole('button', { name: /Bloquear Terminal/i });
    await user.click(lockBtn);

    expect(await screen.findByText(/Terminal Bloqueado/i)).toBeInTheDocument();

    // 4. Entering an invalid PIN in InputOTP shows error feedback
    vi.mocked(api.verifyPin).mockRejectedValueOnce(new Error('PIN incorreto.'));

    const otpInput = screen.getByLabelText(/Digite o PIN de 4 dígitos/i);
    await user.clear(otpInput);
    await user.type(otpInput, '0000');
    await user.click(screen.getByRole('button', { name: /Desbloquear Sala/i }));

    expect(await screen.findByText(/PIN incorreto/i)).toBeInTheDocument();

    // 5. Entering the valid 4-digit PIN unlocks the classroom terminal
    vi.mocked(api.verifyPin).mockResolvedValueOnce({
      valid: true,
      unlockedToken: 'jwt-unlocked-token',
      user: {
        id: 'teacher-1',
        name: 'Prof. Carlos Eduardo',
        email: 'prof@linsdorego.edu.br',
        role: UserRole.TEACHER,
      },
    });

    await user.clear(otpInput);
    await user.type(otpInput, '1234');
    await user.click(screen.getByRole('button', { name: /Desbloquear Sala/i }));

    await waitFor(() => {
      expect(api.verifyPin).toHaveBeenCalledWith('1234', 'jwt-access-token');
    });

    await waitFor(() => {
      expect(screen.queryByText(/Terminal Bloqueado/i)).not.toBeInTheDocument();
    });
  });
});
