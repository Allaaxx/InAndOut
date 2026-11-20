import { randomUUID } from 'node:crypto';
import type { RoomDTO } from '@shared/dtos';
import { normalizeRoomCode } from '@shared/roomCode';

export interface RoomProps {
  id?: string;
  code: string;
  name: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Room {
  public readonly id: string;
  public readonly code: string;
  public readonly name: string;
  private _isActive: boolean;
  public readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    code: string,
    name: string,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.code = code;
    this.name = name;
    this._isActive = isActive;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  public static create(props: RoomProps): Room {
    const normalizedCode = normalizeRoomCode(props.code ?? '');
    if (!normalizedCode) {
      throw new Error('O código da sala é obrigatório.');
    }

    const trimmedName = (props.name ?? '').trim();
    if (!trimmedName) {
      throw new Error('O nome da sala é obrigatório.');
    }

    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? createdAt;

    return new Room(
      props.id ?? randomUUID(),
      normalizedCode,
      trimmedName,
      props.isActive ?? true,
      createdAt,
      updatedAt,
    );
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public setActive(isActive: boolean, now: Date = new Date()): void {
    this._isActive = isActive;
    this._updatedAt = now;
  }

  public toDTO(): RoomDTO {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      isActive: this._isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
