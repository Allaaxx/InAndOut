import { randomUUID } from 'node:crypto';
import { QueueEntryStatus } from '@shared/enums';
import { formatPublicStudentName } from '@shared/formatters';
import { WaitingQueueDTO } from '@shared/dtos';

export interface WaitingQueueEntryProps {
  id?: string;
  sessionId: string;
  studentRa: string;
  studentFullName: string;
  studentPublicName?: string;
  position: number;
  status?: QueueEntryStatus;
  requestedAt?: Date;
  calledAt?: Date;
  expiresAt?: Date;
}

export class WaitingQueueEntry {
  public readonly id: string;
  public readonly sessionId: string;
  public readonly studentRa: string;
  public readonly studentFullName: string;
  public readonly studentPublicName: string;
  private _position: number;
  private _status: QueueEntryStatus;
  public readonly requestedAt: Date;
  private _calledAt?: Date;
  private _expiresAt?: Date;

  private constructor(props: {
    id: string;
    sessionId: string;
    studentRa: string;
    studentFullName: string;
    studentPublicName: string;
    position: number;
    status: QueueEntryStatus;
    requestedAt: Date;
    calledAt?: Date;
    expiresAt?: Date;
  }) {
    this.id = props.id;
    this.sessionId = props.sessionId;
    this.studentRa = props.studentRa;
    this.studentFullName = props.studentFullName;
    this.studentPublicName = props.studentPublicName;
    this._position = props.position;
    this._status = props.status;
    this.requestedAt = props.requestedAt;
    this._calledAt = props.calledAt;
    this._expiresAt = props.expiresAt;
  }

  public static create(props: WaitingQueueEntryProps): WaitingQueueEntry {
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
      throw new Error('O nome completo do aluno é obrigatório.');
    }

    const studentPublicName =
      props.studentPublicName ?? formatPublicStudentName(studentFullName);

    return new WaitingQueueEntry({
      id: props.id ?? randomUUID(),
      sessionId,
      studentRa,
      studentFullName,
      studentPublicName,
      position: Math.max(1, props.position),
      status: props.status ?? QueueEntryStatus.WAITING,
      requestedAt: props.requestedAt ?? new Date(),
      calledAt: props.calledAt,
      expiresAt: props.expiresAt,
    });
  }

  public get position(): number {
    return this._position;
  }

  public get status(): QueueEntryStatus {
    return this._status;
  }

  public get calledAt(): Date | undefined {
    return this._calledAt;
  }

  public get expiresAt(): Date | undefined {
    return this._expiresAt;
  }

  public get abbreviatedName(): string {
    return this.studentPublicName;
  }

  public setPosition(position: number): void {
    this._position = Math.max(1, position);
  }

  public isActive(): boolean {
    return (
      this._status === QueueEntryStatus.WAITING ||
      this._status === QueueEntryStatus.CALLED
    );
  }

  public isExpired(now: Date = new Date()): boolean {
    if (this._status !== QueueEntryStatus.CALLED || !this._expiresAt) {
      return false;
    }
    return now.getTime() > this._expiresAt.getTime();
  }

  public getRemainingConfirmationSeconds(now: Date = new Date()): number {
    if (this._status !== QueueEntryStatus.CALLED || !this._expiresAt) {
      return 0;
    }
    const diffMs = this._expiresAt.getTime() - now.getTime();
    if (diffMs <= 0) {
      return 0;
    }
    return Math.ceil(diffMs / 1000);
  }

  public callSlot(now: Date = new Date(), windowMinutes = 2): void {
    if (!this.isActive()) {
      throw new Error(
        'Apenas solicitações aguardando na fila podem ser chamadas.'
      );
    }
    this._status = QueueEntryStatus.CALLED;
    this._calledAt = now;
    this._expiresAt = new Date(now.getTime() + windowMinutes * 60_000);
  }

  public claim(now?: Date): void {
    if (!this.isActive()) {
      throw new Error(
        'Esta posição na fila não está mais ativa ou já foi encerrada.'
      );
    }
    if (now && this.isExpired(now)) {
      this._status = QueueEntryStatus.EXPIRED;
      throw new Error(
        'A janela de confirmação de 2 minutos expirou e a vaga foi transferida para o próximo da fila.'
      );
    }
    this._status = QueueEntryStatus.CLAIMED;
  }

  public expire(): void {
    this._status = QueueEntryStatus.EXPIRED;
  }

  public cancel(): void {
    if (!this.isActive()) {
      throw new Error(
        'Não é possível cancelar uma posição da fila que já foi encerrada.'
      );
    }
    this._status = QueueEntryStatus.CANCELLED;
  }

  public toDTO(): WaitingQueueDTO {
    return {
      id: this.id,
      sessionId: this.sessionId,
      studentRa: this.studentRa,
      studentFullName: this.studentFullName,
      studentPublicName: this.studentPublicName,
      abbreviatedName: this.studentPublicName,
      position: this._position,
      status: this._status,
      requestedAt: this.requestedAt.toISOString(),
      calledAt: this._calledAt ? this._calledAt.toISOString() : undefined,
      expiresAt: this._expiresAt ? this._expiresAt.toISOString() : undefined,
    };
  }
}
