import { randomUUID } from 'node:crypto';
import type { ClassSessionDTO } from '@shared/dtos';
import { SessionStatus } from '@shared/enums';
import { resolveRoomCode } from '@shared/roomCode';

export interface ClassSessionProps {
  id?: string;
  teacherId: string;
  teacherName?: string;
  roomId?: string;
  classGroupId?: string;
  classCode?: string;
  className?: string;
  subject: string;
  status?: SessionStatus;
  startedAt?: Date;
  startTime?: Date;
  endedAt?: Date;
  endTime?: Date;
  plannedDurationMinutes?: number;
  defaultTimeLimitMinutes?: number;
  timeLimitMinutes?: number;
}

export class ClassSession {
  public readonly id: string;
  public readonly teacherId: string;
  public readonly teacherName: string;
  public readonly roomId: string;
  public readonly classGroupId?: string;
  public readonly classCode: string;
  public readonly subject: string;
  private _status: SessionStatus;
  public readonly startedAt: Date;
  private _endedAt?: Date;
  public readonly plannedDurationMinutes: number;
  public readonly defaultTimeLimitMinutes: number;

  private constructor(
    id: string,
    teacherId: string,
    teacherName: string,
    roomId: string,
    classGroupId: string | undefined,
    classCode: string,
    subject: string,
    status: SessionStatus,
    startedAt: Date,
    endedAt: Date | undefined,
    plannedDurationMinutes: number,
    defaultTimeLimitMinutes: number,
  ) {
    this.id = id;
    this.teacherId = teacherId;
    this.teacherName = teacherName;
    this.roomId = roomId;
    this.classGroupId = classGroupId;
    this.classCode = classCode;
    this.subject = subject;
    this._status = status;
    this.startedAt = startedAt;
    this._endedAt = endedAt;
    this.plannedDurationMinutes = plannedDurationMinutes;
    this.defaultTimeLimitMinutes = defaultTimeLimitMinutes;
  }

  public static create(props: ClassSessionProps): ClassSession {
    const classCode = (props.classCode ?? props.className ?? '').trim();
    if (!classCode) {
      throw new Error(
        'A turma (classCode) é obrigatória para iniciar a sessão.',
      );
    }

    const subject = (props.subject ?? '').trim();
    if (!subject) {
      throw new Error(
        'A disciplina (subject) é obrigatória para iniciar a sessão.',
      );
    }

    const teacherId = (props.teacherId ?? '').trim();
    if (!teacherId) {
      throw new Error(
        'O identificador do professor (teacherId) é obrigatório.',
      );
    }

    const roomId = resolveRoomCode(props.roomId);
    const teacherName =
      (props.teacherName ?? 'Professor').trim() || 'Professor';
    const startedAt = props.startedAt ?? props.startTime ?? new Date();
    const endedAt = props.endedAt ?? props.endTime;
    const status = props.status ?? SessionStatus.ACTIVE;
    const plannedDurationMinutes = props.plannedDurationMinutes ?? 50;
    const defaultTimeLimitMinutes =
      props.defaultTimeLimitMinutes ?? props.timeLimitMinutes ?? 10;

    if (plannedDurationMinutes <= 0) {
      throw new Error('A duração planejada deve ser maior que zero minutos.');
    }

    if (defaultTimeLimitMinutes <= 0) {
      throw new Error('O tempo limite padrão deve ser maior que zero minutos.');
    }

    const classGroupId = props.classGroupId?.trim() || undefined;

    return new ClassSession(
      props.id ?? randomUUID(),
      teacherId,
      teacherName,
      roomId,
      classGroupId,
      classCode,
      subject,
      status,
      startedAt,
      endedAt,
      plannedDurationMinutes,
      defaultTimeLimitMinutes,
    );
  }

  public get status(): SessionStatus {
    return this._status;
  }

  public get endedAt(): Date | undefined {
    return this._endedAt;
  }

  public get className(): string {
    return this.classCode;
  }

  public get startTime(): Date {
    return this.startedAt;
  }

  public get endTime(): Date | undefined {
    return this._endedAt;
  }

  public get timeLimitMinutes(): number {
    return this.defaultTimeLimitMinutes;
  }

  public isActive(): boolean {
    return this._status === SessionStatus.ACTIVE;
  }

  public includesStudent(student: {
    classGroupId?: string;
    classCode: string;
  }): boolean {
    return student.classGroupId && this.classGroupId
      ? student.classGroupId === this.classGroupId
      : student.classCode === this.classCode;
  }

  public end(endedAt: Date = new Date()): void {
    if (this._status === SessionStatus.ENDED) {
      throw new Error('A sessão de aula já está encerrada.');
    }
    this._status = SessionStatus.ENDED;
    this._endedAt = endedAt;
  }

  public getElapsedMinutes(now: Date = new Date()): number {
    const referenceEnd = this._endedAt ?? now;
    const diffMs = Math.max(
      0,
      referenceEnd.getTime() - this.startedAt.getTime(),
    );
    return Math.round((diffMs / 60000) * 100) / 100;
  }

  public toDTO(): ClassSessionDTO {
    return {
      id: this.id,
      teacherId: this.teacherId,
      teacherName: this.teacherName,
      roomId: this.roomId,
      ...(this.classGroupId ? { classGroupId: this.classGroupId } : {}),
      classCode: this.classCode,
      subject: this.subject,
      status: this._status,
      startedAt: this.startedAt.toISOString(),
      endedAt: this._endedAt ? this._endedAt.toISOString() : undefined,
      plannedDurationMinutes: this.plannedDurationMinutes,
      defaultTimeLimitMinutes: this.defaultTimeLimitMinutes,
    };
  }
}
