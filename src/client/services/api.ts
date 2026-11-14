import {
  ActiveSessionResponseDTO,
  EndSessionRequestDTO,
  EndSessionResponseDTO,
  LoginRequestDTO,
  LoginResponseDTO,
  RefreshTokenResponseDTO,
  RequestExitRequestDTO,
  RequestExitResponseDTO,
  StartSessionRequestDTO,
  StartSessionResponseDTO,
  VerifyPinResponseDTO,
} from '@shared/dtos';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_API_URL) ||
  'http://localhost:3333';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Erro HTTP ${response.status}`);
  }
  return data as T;
}

export const api = {
  async login(payload: LoginRequestDTO): Promise<LoginResponseDTO> {
    return request<LoginResponseDTO>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async verifyPin(pin: string, token: string): Promise<VerifyPinResponseDTO> {
    return request<VerifyPinResponseDTO>('/auth/pin/verify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pin }),
    });
  },

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponseDTO> {
    return request<RefreshTokenResponseDTO>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  async getActiveSession(
    roomId = 'SALA-01',
    token?: string
  ): Promise<ActiveSessionResponseDTO> {
    const query = roomId ? `?roomId=${encodeURIComponent(roomId)}` : '';
    return request<ActiveSessionResponseDTO>(`/sessions/active${query}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  async startSession(
    payload: StartSessionRequestDTO,
    token: string
  ): Promise<StartSessionResponseDTO> {
    return request<StartSessionResponseDTO>('/sessions/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

  async endSession(
    payload: EndSessionRequestDTO,
    token: string
  ): Promise<EndSessionResponseDTO> {
    return request<EndSessionResponseDTO>('/sessions/end', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

  async requestExit(
    payload: RequestExitRequestDTO,
    token?: string
  ): Promise<RequestExitResponseDTO> {
    return request<RequestExitResponseDTO>('/movements/exit', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    });
  },
};
