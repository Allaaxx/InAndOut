import {
  AlertLevel,
  IncidentOutcome,
  MovementStatus,
  QueueEntryStatus,
  SessionStatus,
  UserRole,
} from './enums';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginRequestDTO {
  email: string;
  password: string;
  pin?: string;
}

export interface LoginResponseDTO {
  token: string;
  refreshToken: string;
  user: UserDTO;
}

export interface VerifyPinRequestDTO {
  pin: string;
}

export interface VerifyPinResponseDTO {
  valid: boolean;
  unlockedToken: string;
  user: UserDTO;
}

export interface RefreshTokenRequestDTO {
  refreshToken: string;
}

export interface RefreshTokenResponseDTO {
  token: string;
  refreshToken: string;
}

export interface ClassSessionDTO {
  id: string;
  teacherId: string;
  teacherName: string;
  roomId: string;
  classCode: string;
  subject: string;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  plannedDurationMinutes: number;
  defaultTimeLimitMinutes: number;
}

export interface StudentDTO {
  id: string;
  ra: string;
  fullName: string;
  publicName: string;
  classCode: string;
  specialTimeLimitMinutes?: number;
}

export interface MovementDTO {
  id: string;
  sessionId: string;
  studentId: string;
  studentRa: string;
  studentFullName: string;
  studentPublicName: string;
  classCode: string;
  subject: string;
  roomId?: string;
  teacherName?: string;
  status: MovementStatus;
  alertLevel: AlertLevel;
  startedAt: string;
  endedAt?: string;
  allowedLimitMinutes: number;
  elapsedMinutes?: number;
  durationMinutes?: number;
  attendedMinutes?: number;
  attendancePercentage?: number;
  isEmergency: boolean;
  isGuest: boolean;
  authorizedByTeacherId?: string;
  overdueAt?: string;
  escalatedAt?: string;
  escalationType?: 'MANUAL' | 'AUTOMATIC';
  outcome?: IncidentOutcome;
  resolutionNotes?: string;
  resolvedByUserId?: string;
  resolvedAt?: string;
}

export interface WaitingQueueDTO {
  id: string;
  sessionId: string;
  studentRa: string;
  studentFullName: string;
  studentPublicName: string;
  position: number;
  status: QueueEntryStatus;
  requestedAt: string;
  calledAt?: string;
  expiresAt?: string;
}
