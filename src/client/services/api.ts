import {
  LoginRequestDTO,
  LoginResponseDTO,
  RefreshTokenResponseDTO,
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
};
