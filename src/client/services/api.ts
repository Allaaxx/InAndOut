import {
  ActiveSessionResponseDTO,
  CancelQueueResponseDTO,
  CheckOverdueRequestDTO,
  CheckOverdueResponseDTO,
  ClaimQueueRequestDTO,
  ClaimQueueResponseDTO,
  EmergencyExitRequestDTO,
  EndSessionRequestDTO,
  EndSessionResponseDTO,
  EnqueueWaitingRequestDTO,
  EnqueueWaitingResponseDTO,
  EscalateMovementRequestDTO,
  GuestExitRequestDTO,
  LoginRequestDTO,
  LoginResponseDTO,
  MovementDTO,
  RefreshTokenResponseDTO,
  RegisterReturnRequestDTO,
  RegisterReturnResponseDTO,
  RequestExitRequestDTO,
  RequestExitResponseDTO,
  ResolveMovementRequestDTO,
  ResolveMovementResponseDTO,
  SchoolOverviewAnalyticsDTO,
  SchoolOverviewQueryDTO,
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

  async registerReturn(
    payload: RegisterReturnRequestDTO,
    token?: string
  ): Promise<RegisterReturnResponseDTO> {
    return request<RegisterReturnResponseDTO>('/movements/return', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    });
  },

  async enqueueWaiting(
    payload: EnqueueWaitingRequestDTO,
    token?: string
  ): Promise<EnqueueWaitingResponseDTO> {
    return request<EnqueueWaitingResponseDTO>('/movements/queue', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    });
  },

  async cancelQueue(
    ra: string,
    sessionId?: string,
    token?: string
  ): Promise<CancelQueueResponseDTO> {
    const query = sessionId
      ? `?sessionId=${encodeURIComponent(sessionId)}`
      : '';
    return request<CancelQueueResponseDTO>(
      `/movements/queue/${encodeURIComponent(ra)}${query}`,
      {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
  },

  async claimQueueSlot(
    payload: ClaimQueueRequestDTO,
    token?: string
  ): Promise<ClaimQueueResponseDTO> {
    return request<ClaimQueueResponseDTO>('/movements/queue/claim', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    });
  },

  async requestEmergencyExit(
    payload: EmergencyExitRequestDTO,
    token: string
  ): Promise<RequestExitResponseDTO> {
    return request<RequestExitResponseDTO>('/movements/emergency', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

  async requestGuestExit(
    payload: GuestExitRequestDTO,
    token: string
  ): Promise<RequestExitResponseDTO> {
    return request<RequestExitResponseDTO>('/movements/guest-exit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

  async escalateMovement(
    movementId: string,
    payload: EscalateMovementRequestDTO = {},
    token?: string
  ): Promise<{ movement: MovementDTO }> {
    return request<{ movement: MovementDTO }>(
      `/movements/${encodeURIComponent(movementId)}/escalate`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(payload),
      }
    );
  },

  async checkOverdueMovements(
    payload: CheckOverdueRequestDTO = {},
    token?: string
  ): Promise<CheckOverdueResponseDTO> {
    return request<CheckOverdueResponseDTO>('/movements/check-overdue', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    });
  },

  async getCoordinationActiveMovements(
    params: { classCode?: string; status?: string } = {},
    token: string
  ): Promise<{ movements: MovementDTO[] }> {
    const searchParams = new URLSearchParams();
    if (params.classCode) searchParams.append('classCode', params.classCode);
    if (params.status) searchParams.append('status', params.status);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<{ movements: MovementDTO[] }>(
      `/coordination/active-movements${qs}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async resolveMovement(
    movementId: string,
    payload: ResolveMovementRequestDTO,
    token: string
  ): Promise<ResolveMovementResponseDTO> {
    return request<ResolveMovementResponseDTO>(
      `/coordination/movements/${encodeURIComponent(movementId)}/resolve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
  },

  async getOverviewAnalytics(
    params: SchoolOverviewQueryDTO = {},
    token?: string
  ): Promise<SchoolOverviewAnalyticsDTO> {
    const searchParams = new URLSearchParams();
    if (params.date) searchParams.append('date', params.date);
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);
    if (params.classCode && params.classCode !== 'TODOS')
      searchParams.append('classCode', params.classCode);
    if (params.grade && params.grade !== 'TODOS')
      searchParams.append('grade', params.grade);

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<SchoolOverviewAnalyticsDTO>(`/analytics/overview${qs}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};
