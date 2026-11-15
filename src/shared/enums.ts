export enum UserRole {
  TEACHER = 'TEACHER',
  COORDINATOR = 'COORDINATOR',
  ADMIN = 'ADMIN',
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

export enum MovementStatus {
  REQUESTED = 'REQUESTED',
  WAITING_QUEUE = 'WAITING_QUEUE',
  IN_TRANSIT = 'IN_TRANSIT',
  RETURNED_NORMAL = 'RETURNED_NORMAL',
  OVERDUE = 'OVERDUE',
  ESCALATED_TO_COORDINATION = 'ESCALATED_TO_COORDINATION',
  IN_TRANSIT_UNRESOLVED = 'IN_TRANSIT_UNRESOLVED',
  RESOLVED = 'RESOLVED',
}

export enum QueueEntryStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  CLAIMED = 'CLAIMED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum AlertLevel {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
}

export enum IncidentOutcome {
  RETURNED_TO_CLASS = 'RETURNED_TO_CLASS',
  ATTENDED_AT_COORDINATION = 'ATTENDED_AT_COORDINATION',
  HANDLED_AT_COORDINATION = 'HANDLED_AT_COORDINATION',
  SENT_TO_INFIRMARY = 'SENT_TO_INFIRMARY',
  EVASION = 'EVASION',
}

export const INCIDENT_OUTCOME_LABELS: Record<IncidentOutcome, string> = {
  [IncidentOutcome.RETURNED_TO_CLASS]: 'Retornou à sala',
  [IncidentOutcome.ATTENDED_AT_COORDINATION]: 'Atendido na Coordenação',
  [IncidentOutcome.HANDLED_AT_COORDINATION]: 'Atendido na Coordenação',
  [IncidentOutcome.SENT_TO_INFIRMARY]: 'Encaminhado à Enfermaria',
  [IncidentOutcome.EVASION]: 'Evasão',
};

