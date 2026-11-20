import { randomUUID } from 'node:crypto';
import type { StudentDTO } from '@shared/dtos';
import { formatPublicStudentName } from '@shared/formatters';
import { StudentRA } from '../value-objects/StudentRA';

export interface StudentProps {
  id?: string;
  ra: string | StudentRA;
  fullName?: string;
  name?: string;
  classGroupId?: string;
  classCode?: string;
  className?: string;
  specialTimeLimitMinutes?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StudentUpdateProps {
  fullName?: string;
  classGroupId?: string;
  classCode?: string;
  specialTimeLimitMinutes?: number | null;
}

export class Student {
  public readonly id: string;
  private readonly _ra: StudentRA;
  private _fullName: string;
  private _classGroupId?: string;
  private _classCode: string;
  private _specialTimeLimitMinutes?: number;
  private _isActive: boolean;
  public readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    ra: StudentRA,
    fullName: string,
    classCode: string,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
    classGroupId?: string,
    specialTimeLimitMinutes?: number,
  ) {
    this.id = id;
    this._ra = ra;
    this._fullName = fullName;
    this._classGroupId = classGroupId;
    this._classCode = classCode;
    this._specialTimeLimitMinutes = specialTimeLimitMinutes;
    this._isActive = isActive;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  public static create(props: StudentProps): Student {
    const raObj =
      props.ra instanceof StudentRA ? props.ra : StudentRA.create(props.ra);

    const fullName = (props.fullName ?? props.name ?? '').trim();
    if (!fullName) {
      throw new Error('O nome completo do aluno (fullName) é obrigatório.');
    }

    const classCode = (props.classCode ?? props.className ?? '').trim();
    if (!classCode) {
      throw new Error('A turma do aluno (classCode) é obrigatória.');
    }

    if (
      props.specialTimeLimitMinutes !== undefined &&
      (!Number.isInteger(props.specialTimeLimitMinutes) ||
        props.specialTimeLimitMinutes <= 0)
    ) {
      throw new Error('O Tempo Especial deve ser maior que zero minutos.');
    }

    const now = props.createdAt ?? new Date();
    const updatedAt = props.updatedAt ?? now;
    const classGroupId = props.classGroupId?.trim() || undefined;

    return new Student(
      props.id ?? randomUUID(),
      raObj,
      fullName,
      classCode,
      props.isActive ?? true,
      now,
      updatedAt,
      classGroupId,
      props.specialTimeLimitMinutes,
    );
  }

  public get ra(): string {
    return this._ra.value;
  }

  public get raObject(): StudentRA {
    return this._ra;
  }

  public get fullName(): string {
    return this._fullName;
  }

  public get name(): string {
    return this._fullName;
  }

  public get classGroupId(): string | undefined {
    return this._classGroupId;
  }

  public get classCode(): string {
    return this._classCode;
  }

  public get className(): string {
    return this._classCode;
  }

  public get specialTimeLimitMinutes(): number | undefined {
    return this._specialTimeLimitMinutes;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * LGPD-compliant abbreviated display name for public classroom terminals (e.g., "Lucas S.")
   */
  public get publicName(): string {
    return formatPublicStudentName(this._fullName);
  }

  /**
   * Alias for LGPD-compliant abbreviated display name (e.g., "Lucas S.")
   */
  public get abbreviatedName(): string {
    return formatPublicStudentName(this._fullName);
  }

  public hasSpecialTimeLimit(): boolean {
    return (
      this._specialTimeLimitMinutes !== undefined &&
      this._specialTimeLimitMinutes > 0
    );
  }

  public getEffectiveTimeLimitMinutes(classDefaultLimitMinutes = 10): number {
    return this._specialTimeLimitMinutes ?? classDefaultLimitMinutes;
  }

  public update(changes: StudentUpdateProps, updatedAt = new Date()): void {
    if (changes.fullName !== undefined) {
      const trimmedName = changes.fullName.trim();
      if (!trimmedName) {
        throw new Error('O nome completo do aluno (fullName) é obrigatório.');
      }
      this._fullName = trimmedName;
    }

    if (changes.classGroupId !== undefined) {
      this._classGroupId = changes.classGroupId.trim() || undefined;
    }

    if (changes.classCode !== undefined) {
      const trimmedCode = changes.classCode.trim();
      if (!trimmedCode) {
        throw new Error('A turma do aluno (classCode) é obrigatória.');
      }
      this._classCode = trimmedCode;
    }

    if (changes.specialTimeLimitMinutes !== undefined) {
      if (changes.specialTimeLimitMinutes === null) {
        this._specialTimeLimitMinutes = undefined;
      } else {
        if (
          !Number.isInteger(changes.specialTimeLimitMinutes) ||
          changes.specialTimeLimitMinutes <= 0
        ) {
          throw new Error('O Tempo Especial deve ser maior que zero minutos.');
        }
        this._specialTimeLimitMinutes = changes.specialTimeLimitMinutes;
      }
    }

    this._updatedAt = updatedAt;
  }

  public setActive(isActive: boolean, updatedAt = new Date()): void {
    this._isActive = isActive;
    this._updatedAt = updatedAt;
  }

  public toDTO(): StudentDTO {
    const pubName = this.publicName;
    const hasSpecialCondition = this.hasSpecialTimeLimit();
    return {
      id: this.id,
      ra: this.ra,
      fullName: this._fullName,
      publicName: pubName,
      abbreviatedName: pubName,
      classGroupId: this._classGroupId,
      classCode: this._classCode,
      hasSpecialCondition,
      specialLimitMinutes: this._specialTimeLimitMinutes,
      specialTimeLimitMinutes: this._specialTimeLimitMinutes,
      isActive: this._isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
