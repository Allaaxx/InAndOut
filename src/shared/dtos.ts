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

export interface StartSessionRequestDTO {
  classCode?: string;
  className?: string;
  subject: string;
  roomId?: string;
  plannedDurationMinutes?: number;
  defaultTimeLimitMinutes?: number;
  timeLimitMinutes?: number;
  teacherId?: string;
  teacherName?: string;
}

export interface StartSessionResponseDTO {
  session: ClassSessionDTO;
}

export interface ActiveSessionResponseDTO {
  session: ClassSessionDTO | null;
  activeMovements: MovementDTO[];
  queue: WaitingQueueDTO[];
}

export interface EndSessionRequestDTO {
  sessionId?: string;
  roomId?: string;
}

export interface SessionMetricsDTO {
  totalExits: number;
  inTransitUnresolvedCount: number;
  elapsedMinutes: number;
}

export interface EndSessionResponseDTO {
  session: ClassSessionDTO;
  metrics: SessionMetricsDTO;
  inTransitMovements: MovementDTO[];
}

export interface StudentDTO {
  id: string;
  ra: string;
  fullName: string;
  publicName: string;
  abbreviatedName?: string;
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
  abbreviatedName?: string;
  studentAbbreviatedName?: string;
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
  resolvedByCoordinatorId?: string;
  resolvedAt?: string;
}

export interface RequestExitRequestDTO {
  ra: string;
  sessionId?: string;
  roomId?: string;
}

export interface RequestExitResponseDTO {
  movement: MovementDTO;
}

export interface RegisterReturnRequestDTO {
  ra: string;
  sessionId?: string;
  roomId?: string;
}

export interface RegisterReturnResponseDTO {
  movement: MovementDTO;
  message?: string;
  nextCalledQueueEntry?: WaitingQueueDTO | null;
}

export interface WaitingQueueDTO {
  id: string;
  sessionId: string;
  studentRa: string;
  studentFullName: string;
  studentPublicName: string;
  abbreviatedName?: string;
  position: number;
  status: QueueEntryStatus;
  requestedAt: string;
  calledAt?: string;
  expiresAt?: string;
}

export interface EnqueueWaitingRequestDTO {
  ra: string;
  sessionId?: string;
  roomId?: string;
}

export interface EnqueueWaitingResponseDTO {
  entry: WaitingQueueDTO;
  queue: WaitingQueueDTO[];
}

export interface CancelQueueResponseDTO {
  cancelled: boolean;
  queue: WaitingQueueDTO[];
}

export interface ClaimQueueRequestDTO {
  ra: string;
  sessionId?: string;
  roomId?: string;
}

export interface ClaimQueueResponseDTO {
  movement: MovementDTO;
  queue: WaitingQueueDTO[];
}

export interface EmergencyExitRequestDTO {
  ra: string;
  sessionId?: string;
  roomId?: string;
  reason?: string;
}

export interface GuestExitRequestDTO {
  ra: string;
  fullName?: string;
  originClassCode?: string;
  sessionId?: string;
  roomId?: string;
  forceConcurrent?: boolean;
}

export interface EscalateMovementRequestDTO {
  notes?: string;
}

export interface CheckOverdueRequestDTO {
  now?: string;
  sessionId?: string;
  roomId?: string;
}

export interface CheckOverdueResponseDTO {
  alerts: MovementDTO[];
  overdueMovements: MovementDTO[];
  autoEscalatedMovements: MovementDTO[];
}

export interface CoordinationActiveMovementsResponseDTO {
  movements: MovementDTO[];
}

export interface ResolveMovementRequestDTO {
  outcome: IncidentOutcome;
  notes?: string;
  resolutionNotes?: string;
}

export interface ResolveMovementResponseDTO {
  movement: MovementDTO;
}

export interface SchoolOverviewStatsDTO {
  averageOutsideMinutes: number;
  averageAbsentMinutes: number;
  totalExitsToday: number;
  complianceRate: number;
  activeIncidentsCount: number;
  activeIncidents: number;
}

export interface HourlyDistributionItemDTO {
  hour: number;
  label: string;
  count: number;
}

export interface OutcomeDistributionItemDTO {
  outcome: string;
  label: string;
  count: number;
  percentage: number;
}

export interface SchoolOverviewAnalyticsDTO {
  stats: SchoolOverviewStatsDTO;
  hourlyDistribution: HourlyDistributionItemDTO[];
  peakHours: HourlyDistributionItemDTO[];
  outcomeDistribution: OutcomeDistributionItemDTO[];
  outcomesDistribution: OutcomeDistributionItemDTO[];
}

export interface SchoolOverviewQueryDTO {
  date?: string;
  startDate?: string;
  endDate?: string;
  classCode?: string;
  grade?: string;
}

