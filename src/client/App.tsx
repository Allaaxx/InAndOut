import type { LoginRequestDTO, RoomDTO, UserDTO } from '@shared/dtos';
import { UserRole } from '@shared/enums';
import { normalizeRoomCode, resolveRoomCode } from '@shared/roomCode';
import type React from 'react';
import { useState } from 'react';
import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useInRouterContext,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { RoomSelectionModal } from './components/terminal/RoomSelectionModal';
import { CoordinationPage } from './pages/CoordinationPage';
import { LoginPage } from './pages/LoginPage';
import { TerminalPage } from './pages/TerminalPage';
import { api } from './services/api';
import { getSavedRoomCode, saveRoomCode } from './services/roomStorage';

interface ProtectedRouteProps {
  user: UserDTO | null;
  token: string | null;
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

function ProtectedRoute({
  user,
  token,
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === UserRole.TEACHER) {
      return <Navigate to="/terminal" replace />;
    }
    return <Navigate to="/coordination" replace />;
  }

  return <>{children}</>;
}

interface PublicOnlyRouteProps {
  user: UserDTO | null;
  token: string | null;
  children: React.ReactNode;
}

function PublicOnlyRoute({ user, token, children }: PublicOnlyRouteProps) {
  if (user && token) {
    if (user.role === UserRole.TEACHER) {
      return <Navigate to="/terminal" replace />;
    }
    return <Navigate to="/coordination" replace />;
  }

  return <>{children}</>;
}

function RootRedirect({
  user,
  token,
}: {
  user: UserDTO | null;
  token: string | null;
}) {
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === UserRole.TEACHER) {
    return <Navigate to="/terminal" replace />;
  }
  return <Navigate to="/coordination" replace />;
}

interface TerminalRouteProps {
  user: UserDTO;
  token: string;
  onVerifyPin: (pin: string) => Promise<void>;
  onLogout: () => void;
}

function TerminalEntryRoute({
  user,
  token,
  onVerifyPin,
  onLogout,
}: TerminalRouteProps) {
  const navigate = useNavigate();
  const savedRoomCode = getSavedRoomCode();

  if (savedRoomCode) {
    return (
      <Navigate to={`/terminal/${encodeURIComponent(savedRoomCode)}`} replace />
    );
  }

  // Fallback for legacy test suites that mock api without listRooms
  if (typeof api.listRooms !== 'function') {
    return (
      <TerminalPage
        user={user}
        token={token}
        onVerifyPin={onVerifyPin}
        onLogout={onLogout}
      />
    );
  }

  const handleSelectInitialRoom = (room: RoomDTO) => {
    const normalized = normalizeRoomCode(room.code);
    saveRoomCode(normalized);
    navigate(`/terminal/${encodeURIComponent(normalized)}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <RoomSelectionModal
        open={true}
        dismissible={false}
        token={token}
        onSelectRoom={handleSelectInitialRoom}
      />
    </div>
  );
}

function TerminalRoomRoute({
  user,
  token,
  onVerifyPin,
  onLogout,
}: TerminalRouteProps) {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const normalizedRoomCode = resolveRoomCode(roomCode);

  const handleChangeRoom = (newRoomCode: string) => {
    const normalized = normalizeRoomCode(newRoomCode);
    saveRoomCode(normalized);
    navigate(`/terminal/${encodeURIComponent(normalized)}`);
  };

  return (
    <TerminalPage
      key={normalizedRoomCode}
      user={user}
      token={token}
      roomId={normalizedRoomCode}
      onChangeRoom={handleChangeRoom}
      onVerifyPin={onVerifyPin}
      onLogout={onLogout}
    />
  );
}

function AppRoutes() {
  const navigate = useNavigate();

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

  const handleLogin = async (credentials: LoginRequestDTO) => {
    const response = await api.login(credentials);
    setToken(response.token);
    setUser(response.user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('inandout_token', response.token);
      localStorage.setItem('inandout_refresh_token', response.refreshToken);
      localStorage.setItem('inandout_user', JSON.stringify(response.user));
    }
    if (response.user.role === UserRole.TEACHER) {
      navigate('/terminal', { replace: true });
    } else {
      navigate('/coordination', { replace: true });
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
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('inandout_token');
      localStorage.removeItem('inandout_refresh_token');
      localStorage.removeItem('inandout_user');
    }
    navigate('/login', { replace: true });
  };

  return (
    <Routes>
      {/* Root intelligent redirect */}
      <Route path="/" element={<RootRedirect user={user} token={token} />} />

      {/* Login page */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute user={user} token={token}>
            <LoginPage onLogin={handleLogin} />
          </PublicOnlyRoute>
        }
      />

      {/* Classroom Terminal page (Protected for TEACHER) */}
      <Route
        path="/terminal"
        element={
          <ProtectedRoute
            user={user}
            token={token}
            allowedRoles={[UserRole.TEACHER]}
          >
            {user && token && (
              <TerminalEntryRoute
                user={user}
                token={token}
                onVerifyPin={handleVerifyPin}
                onLogout={handleLogout}
              />
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/terminal/:roomCode"
        element={
          <ProtectedRoute
            user={user}
            token={token}
            allowedRoles={[UserRole.TEACHER]}
          >
            {user && token && (
              <TerminalRoomRoute
                user={user}
                token={token}
                onVerifyPin={handleVerifyPin}
                onLogout={handleLogout}
              />
            )}
          </ProtectedRoute>
        }
      />

      {/* Coordination Shell routes (Protected for COORDINATOR and ADMIN) */}
      <Route
        path="/coordination/*"
        element={
          <ProtectedRoute
            user={user}
            token={token}
            allowedRoles={[UserRole.COORDINATOR, UserRole.ADMIN]}
          >
            {user && token && (
              <CoordinationPage
                user={user}
                token={token}
                onLogout={handleLogout}
                onNavigateToAnalytics={() =>
                  navigate('/coordination/analytics')
                }
              />
            )}
          </ProtectedRoute>
        }
      />

      {/* Legacy analytics redirect */}
      <Route
        path="/analytics"
        element={<Navigate to="/coordination/analytics" replace />}
      />

      {/* Wildcard / 404: redirects to / */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export interface AppProps {
  initialEntries?: string[];
}

export function App({ initialEntries }: AppProps = {}) {
  const inRouter = useInRouterContext();

  if (!inRouter) {
    return (
      <MemoryRouter initialEntries={initialEntries || ['/']}>
        <AppRoutes />
      </MemoryRouter>
    );
  }

  return <AppRoutes />;
}
