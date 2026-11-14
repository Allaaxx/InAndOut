import React, { useState } from 'react';
import { LoginRequestDTO, UserDTO } from '@shared/dtos';
import { api } from './services/api';
import { LoginPage } from './pages/LoginPage';
import { TerminalPage } from './pages/TerminalPage';

export function App() {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const handleLogin = async (credentials: LoginRequestDTO) => {
    const response = await api.login(credentials);
    setToken(response.token);
    setUser(response.user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('inandout_token', response.token);
      localStorage.setItem('inandout_refresh_token', response.refreshToken);
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
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('inandout_token');
      localStorage.removeItem('inandout_refresh_token');
    }
  };

  if (!user || !token) {
    return <LoginPage onLogin={handleLogin} />;
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
export default App;
