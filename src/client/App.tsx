import type { LoginRequestDTO, UserDTO } from '@shared/dtos';
import { UserRole } from '@shared/enums';
import { useState } from 'react';
import { AnalyticsDashboardPage } from './pages/AnalyticsDashboardPage';
import { CoordinationPage } from './pages/CoordinationPage';
import { LoginPage } from './pages/LoginPage';
import { TerminalPage } from './pages/TerminalPage';
import { api } from './services/api';

export function App() {
  const [user, setUser] = useState<UserDTO | null>(() => {
    if (typeof localStorage === 'undefined') return null;
    try {
      const stored = localStorage.getItem('inandout_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('inandout_token') || null;
  });
  const [currentPage, setCurrentPage] = useState<'default' | 'analytics'>(
    'default',
  );

  const handleLogin = async (credentials: LoginRequestDTO) => {
    const response = await api.login(credentials);
    setToken(response.token);
    setUser(response.user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('inandout_token', response.token);
      localStorage.setItem('inandout_refresh_token', response.refreshToken);
      localStorage.setItem('inandout_user', JSON.stringify(response.user));
    }
  };

  const handleVerifyPin = async (pin: string) => {
    if (!token) {
      throw new Error('Sessão expirada.');
    }
    const response = await api.verifyPin(pin, token);
    setToken(response.unlockedToken);
    setUser(response.user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('inandout_token', response.unlockedToken);
      localStorage.setItem('inandout_user', JSON.stringify(response.user));
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setCurrentPage('default');
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('inandout_token');
      localStorage.removeItem('inandout_refresh_token');
      localStorage.removeItem('inandout_user');
    }
  };

  if (!user || !token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (currentPage === 'analytics') {
    return (
      <AnalyticsDashboardPage
        user={user}
        token={token}
        onLogout={handleLogout}
        onNavigateBack={() => setCurrentPage('default')}
      />
    );
  }

  if (user.role === UserRole.COORDINATOR || user.role === UserRole.ADMIN) {
    return (
      <CoordinationPage
        user={user}
        token={token}
        onLogout={handleLogout}
        onNavigateToAnalytics={() => setCurrentPage('analytics')}
      />
    );
  }

  return (
    <TerminalPage
      user={user}
      token={token}
      onVerifyPin={handleVerifyPin}
      onLogout={handleLogout}
    />
  );
}
