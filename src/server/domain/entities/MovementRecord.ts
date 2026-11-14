import { randomUUID } from 'node:crypto';
import {
  AlertLevel,
  formatPublicStudentName,
  IncidentOutcome,
  MovementStatus,
} from '@shared/enums';
import { MovementDTO } from '@shared/dtos';
import { DurationMinutes } from '../value-objects/DurationMinutes';

export interface MovementRecordProps {
  id?: string;
  sessionId: string;
  studentId: string;
  studentRa: string;
  studentFullName: string;
  studentPublicName?: string;
  classCode: string;
  subject: string;
  roomId?: string;
  teacherName?: string;
  status?: MovementStatus;
  startedAt?: Date;
  endedAt?: Date;
  allowedLimitMinutes?: number;
  durationMinutes?: number;
  attendedMinutes?: number;
  attendancePercentage?: number;
  isEmergency?: boolean;
  isGuest?: boolean;
  authorizedByTeacherId?: string;
  overdueAt?: Date;
  escalatedAt?: Date;
  escalationType?: 'MANUAL' | 'AUTOMATIC';
  outcome?: IncidentOutcome;
  resolutionNotes?: string;
  resolvedByUserId?: string;
  resolvedByCoordinatorId?: string;
  resolvedAt?: Date;
}

export class MovementRecord {
  public readonly id: string;
  public readonly sessionId: string;
  public readonly studentId: string;
  public readonly studentRa: string;
  public readonly studentFullName: string;
  public readonly studentPublicName: string;
  public readonly classCode: string;
  public readonly subject: string;
  public readonly roomId?: string;
  public readonly teacherName?: string;
  private _status: MovementStatus;
  public readonly startedAt: Date;
  private _endedAt?: Date;
  public readonly allowedLimitMinutes: number;
  private _durationMinutes?: number;
  private _attendedMinutes?: number;
  private _attendancePercentage?: number;
  public readonly isEmergency: boolean;
  public readonly isGuest: boolean;
  public readonly authorizedByTeacherId?: string;
  private _overdueAt?: Date;
  private _escalatedAt?: Date;
  private _escalationType?: 'MANUAL' | 'AUTOMATIC';
  private _outcome?: IncidentOutcome;
  private _resolutionNotes?: string;
  private _resolvedByUserId?: string;
  private _resolvedAt?: Date;

  private constructor(props: {
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
    startedAt: Date;
    endedAt?: Date;
    allowedLimitMinutes: number;
    durationMinutes?: number;
    attendedMinutes?: number;
    attendancePercentage?: number;
    isEmergency: boolean;
    isGuest: boolean;
    authorizedByTeacherId?: string;
    overdueAt?: Date;
    escalatedAt?: Date;
    escalationType?: 'MANUAL' | 'AUTOMATIC';
    outcome?: IncidentOutcome;
    resolutionNotes?: string;
    resolvedByUserId?: string;
    resolvedAt?: Date;
  }) {
    this.id = props.id;
    this.sessionId = props.sessionId;
    this.studentId = props.studentId;
    this.studentRa = props.studentRa;
    this.studentFullName = props.studentFullName;
    this.studentPublicName = props.studentPublicName;
    this.classCode = props.classCode;
    this.subject = props.subject;
    this.roomId = props.roomId;
    this.teacherName = props.teacherName;
    this._status = props.status;
    this.startedAt = props.startedAt;
    this._endedAt = props.endedAt;
    this.allowedLimitMinutes = props.allowedLimitMinutes;
    this._durationMinutes = props.durationMinutes;
    this._attendedMinutes = props.attendedMinutes;
    this._attendancePercentage = props.attendancePercentage;
    this.isEmergency = props.isEmergency;
    this.isGuest = props.isGuest;
    this.authorizedByTeacherId = props.authorizedByTeacherId;
    this._overdueAt = props.overdueAt;
    this._escalatedAt = props.escalatedAt;
    this._escalationType = props.escalationType;
    this._outcome = props.outcome;
    this._resolutionNotes = props.resolutionNotes;
    this._resolvedByUserId = props.resolvedByUserId;
    this._resolvedAt = props.resolvedAt;
  }

  public static create(props: MovementRecordProps): MovementRecord {
    const sessionId = (props.sessionId ?? '').trim();
    if (!sessionId) {
      throw new Error('O identificador da sessão (sessionId) é obrigatório.');
    }

    const studentRa = (props.studentRa ?? '').trim();
    if (!studentRa) {
      throw new Error('O RA do aluno (studentRa) é obrigatório.');
    }

    const studentFullName = (props.studentFullName ?? '').trim();
    if (!studentFullName) {
      throw new Error('O nome completo do aluno (studentFullName) é obrigatório.');
    }

    const allowedLimitMinutes = props.allowedLimitMinutes ?? 10;
    if (allowedLimitMinutes <= 0) {
      throw new Error('O tempo limite permitido deve ser maior que zero minutos.');
    }

    const studentPublicName =
      props.studentPublicName ?? formatPublicStudentName(studentFullName);

    return new MovementRecord({
      id: props.id ?? randomUUID(),
      sessionId,
      studentId: (props.studentId ?? studentRa).trim(),
      studentRa,
      studentFullName,
      studentPublicName,
      classCode: (props.classCode ?? '').trim(),
      subject: (props.subject ?? '').trim(),
      roomId: props.roomId,
      teacherName: props.teacherName,
      status: props.status ?? MovementStatus.IN_TRANSIT,
      startedAt: props.startedAt ?? new Date(),
      endedAt: props.endedAt,
      allowedLimitMinutes,
      durationMinutes: props.durationMinutes,
      attendedMinutes: props.attendedMinutes,
      attendancePercentage: props.attendancePercentage,
      isEmergency: props.isEmergency ?? false,
      isGuest: props.isGuest ?? false,
      authorizedByTeacherId: props.authorizedByTeacherId,
      overdueAt: props.overdueAt,
      escalatedAt: props.escalatedAt,
      escalationType: props.escalationType,
      outcome: props.outcome,
      resolutionNotes: props.resolutionNotes,
      resolvedByUserId: props.resolvedByUserId ?? props.resolvedByCoordinatorId,
      resolvedAt: props.resolvedAt,
    });
  }

  public get status(): MovementStatus {
    return this._status;
  }

  public get endedAt(): Date | undefined {
    return this._endedAt;
  }

  public get abbreviatedName(): string {
    return this.studentPublicName;
  }

  public get studentAbbreviatedName(): string {
    return this.studentPublicName;
  }

  public get durationMinutes(): number | undefined {
    return this._durationMinutes;
  }

  public get attendedMinutes(): number | undefined {
    return this._attendedMinutes;
  }

  public get attendancePercentage(): number | undefined {
    return this._attendancePercentage;
  }

  public static readonly TEACHER_GRACE_WINDOW_MINUTES = 2;

  public get overdueAt(): Date | undefined {
    return this._overdueAt;
  }

  public get graceEndsAt(): Date | undefined {
    if (!this._overdueAt) {
      return undefined;
    }
    return new Date(
      this._overdueAt.getTime() +
        MovementRecord.TEACHER_GRACE_WINDOW_MINUTES * 60_000
    );
  }

  public get escalatedAt(): Date | undefined {
    return this._escalatedAt;
  }

  public get escalationType(): 'MANUAL' | 'AUTOMATIC' | undefined {
    return this._escalationType;
  }

  public get outcome(): IncidentOutcome | undefined {
    return this._outcome;
  }

  public get resolutionNotes(): string | undefined {
    return this._resolutionNotes;
  }

  public get resolvedByUserId(): string | undefined {
    return this._resolvedByUserId;
  }

  public get resolvedByCoordinatorId(): string | undefined {
    return this._resolvedByUserId;
  }

  public get resolvedAt(): Date | undefined {
    return this._resolvedAt;
  }

  public isActive(): boolean {
    return (
      this._status === MovementStatus.IN_TRANSIT ||
      this._status === MovementStatus.OVERDUE ||
      this._status === MovementStatus.ESCALATED_TO_COORDINATION
    );
  }

  public getElapsedMinutes(now: Date = new Date()): number {
    const referenceEnd = this._endedAt ?? now;
    const diffMs = Math.max(
      0,
      referenceEnd.getTime() - this.startedAt.getTime()
    );
    return Math.round((diffMs / 60000) * 100) / 100;
  }

  public isWarningThresholdReached(now: Date = new Date()): boolean {
    const ratio = this.getElapsedMinutes(now) / this.allowedLimitMinutes;
    return ratio >= 0.8 && ratio <= 1.0;
  }

  public isOverdueThresholdReached(now: Date = new Date()): boolean {
    if (
      this._status === MovementStatus.OVERDUE ||
      this._status === MovementStatus.ESCALATED_TO_COORDINATION
    ) {
      return true;
    }
    return this.getElapsedMinutes(now) > this.allowedLimitMinutes;
  }

  public isGraceWindowExpired(now: Date = new Date()): boolean {
    if (!this._overdueAt) {
      return false;
    }
    const elapsedSinceOverdueMs = now.getTime() - this._overdueAt.getTime();
    return (
      elapsedSinceOverdueMs >=
      MovementRecord.TEACHER_GRACE_WINDOW_MINUTES * 60_000
    );
  }

  public getAlertLevel(now: Date = new Date()): AlertLevel {
    if (
      this._status === MovementStatus.OVERDUE ||
      this._status === MovementStatus.ESCALATED_TO_COORDINATION
    ) {
      return AlertLevel.RED;
    }

    const elapsed = this.getElapsedMinutes(now);
    const ratio = elapsed / this.allowedLimitMinutes;

    if (ratio > 1.0) {
      return AlertLevel.RED;
    }
    if (ratio >= 0.8) {
      return AlertLevel.YELLOW;
    }
    return AlertLevel.GREEN;
  }

  public registerReturn(
    endedAt: Date = new Date(),
    plannedSessionDurationMinutes = 50
  ): void {
    if (!this.isActive()) {
      throw new Error(
        'Este registro de saída já foi encerrado e não está mais ativo.'
      );
    }

    const durationCalc = DurationMinutes.fromDates(
      this.startedAt,
      endedAt,
      plannedSessionDurationMinutes
    );

    this._endedAt = endedAt;
    this._status = MovementStatus.RETURNED_NORMAL;
    this._durationMinutes = durationCalc.durationMinutes;
    this._attendedMinutes = durationCalc.attendedMinutes;
    this._attendancePercentage = durationCalc.attendancePercentage;
  }

  public markOverdue(overdueAt: Date = new Date()): void {
    if (this._status === MovementStatus.IN_TRANSIT) {
      this._status = MovementStatus.OVERDUE;
      this._overdueAt = this._overdueAt ?? overdueAt;
    }
  }

  public escalate(
    escalatedAt: Date = new Date(),
    type: 'MANUAL' | 'AUTOMATIC' = 'MANUAL',
    notes?: string
  ): void {
    if (!this.isActive()) {
      throw new Error(
        'Não é possível escalar uma saída que já foi encerrada e não está mais ativa.'
      );
    }
    this._status = MovementStatus.ESCALATED_TO_COORDINATION;
    this._escalatedAt = escalatedAt;
    this._escalationType = type;
    if (!this._overdueAt) {
      this._overdueAt = escalatedAt;
    }
    if (notes) {
      this._resolutionNotes = notes;
    }
  }

  public markInTransitUnresolved(): void {
    if (this.isActive()) {
      this._status = MovementStatus.IN_TRANSIT_UNRESOLVED;
    }
  }

  public resolve(
    outcome: IncidentOutcome,
    resolvedByUserId: string,
    resolvedAt: Date = new Date(),
    notes?: string,
    plannedSessionDurationMinutes = 50
  ): void {
    this._status = MovementStatus.RESOLVED;
    this._outcome = outcome;
    this._resolvedByUserId = resolvedByUserId;
    this._resolvedAt = resolvedAt;
    if (notes !== undefined) {
      this._resolutionNotes = notes;
    }
    if (!this._endedAt) {
      this._endedAt = resolvedAt;
      const duration = this.getElapsedMinutes(resolvedAt);
      this._durationMinutes = duration;
      const attended = Math.max(
        0,
        Math.round((plannedSessionDurationMinutes - duration) * 100) / 100
      );
      this._attendedMinutes = attended;
      this._attendancePercentage =
        plannedSessionDurationMinutes > 0
          ? Math.round((attended / plannedSessionDurationMinutes) * 10000) / 100
          : 100;
    }
  }

  public toDTO(now: Date = new Date()): MovementDTO {
    return {
      id: this.id,
      sessionId: this.sessionId,
      studentId: this.studentId,
      studentRa: this.studentRa,
      studentFullName: this.studentFullName,
      studentPublicName: this.studentPublicName,
      abbreviatedName: this.studentPublicName,
      studentAbbreviatedName: this.studentPublicName,
      classCode: this.classCode,
      subject: this.subject,
      roomId: this.roomId,
      teacherName: this.teacherName,
      status: this._status,
      alertLevel: this.getAlertLevel(now),
      startedAt: this.startedAt.toISOString(),
      endedAt: this._endedAt ? this._endedAt.toISOString() : undefined,
      allowedLimitMinutes: this.allowedLimitMinutes,
      elapsedMinutes: this.getElapsedMinutes(now),
      durationMinutes: this._durationMinutes,
      attendedMinutes: this._attendedMinutes,
      attendancePercentage: this._attendancePercentage,
      isEmergency: this.isEmergency,
      isGuest: this.isGuest,
      authorizedByTeacherId: this.authorizedByTeacherId,
      overdueAt: this._overdueAt ? this._overdueAt.toISOString() : undefined,
      escalatedAt: this._escalatedAt
        ? this._escalatedAt.toISOString()
        : undefined,
      escalationType: this._escalationType,
      outcome: this._outcome,
      resolutionNotes: this._resolutionNotes,
      resolvedByUserId: this._resolvedByUserId,
      resolvedByCoordinatorId: this._resolvedByUserId,
      resolvedAt: this._resolvedAt ? this._resolvedAt.toISOString() : undefined,
    };
  }
}
