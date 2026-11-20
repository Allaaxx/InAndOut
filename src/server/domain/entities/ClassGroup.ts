import { randomUUID } from 'node:crypto';
import type { ClassGroupDTO } from '@shared/dtos';

export const MIN_ACADEMIC_YEAR = 2000;
export const MAX_ACADEMIC_YEAR = 2100;

export function normalizeClassCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidAcademicYear(year: unknown): year is number {
  return (
    typeof year === 'number' &&
    Number.isInteger(year) &&
    year >= MIN_ACADEMIC_YEAR &&
    year <= MAX_ACADEMIC_YEAR
  );
}

export interface ClassGroupProps {
  id?: string;
  code: string;
  name: string;
  academicYear: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateClassGroupProps {
  name?: string;
  academicYear?: number;
}

export class ClassGroup {
  public readonly id: string;
  public readonly code: string;
  private _name: string;
  private _academicYear: number;
  private _isActive: boolean;
  public readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    code: string,
    name: string,
    academicYear: number,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.code = code;
    this._name = name;
    this._academicYear = academicYear;
    this._isActive = isActive;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  public static create(props: ClassGroupProps): ClassGroup {
    const normalizedCode = normalizeClassCode(props.code ?? '');
    if (!normalizedCode) {
      throw new Error('O código da turma é obrigatório.');
    }

    const trimmedName = (props.name ?? '').trim();
    if (!trimmedName) {
      throw new Error('O nome da turma é obrigatório.');
    }

    if (!isValidAcademicYear(props.academicYear)) {
      throw new Error(
        `O ano letivo deve ser um número inteiro entre ${MIN_ACADEMIC_YEAR} e ${MAX_ACADEMIC_YEAR}.`,
      );
    }

    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? createdAt;

    return new ClassGroup(
      props.id ?? randomUUID(),
      normalizedCode,
      trimmedName,
      props.academicYear,
      props.isActive ?? true,
      createdAt,
      updatedAt,
    );
  }

  public get name(): string {
    return this._name;
  }

  public get academicYear(): number {
    return this._academicYear;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public update(props: UpdateClassGroupProps, now: Date = new Date()): void {
    if (props.name !== undefined) {
      const trimmedName = props.name.trim();
      if (!trimmedName) {
        throw new Error('O nome da turma é obrigatório.');
      }
      this._name = trimmedName;
    }

    if (props.academicYear !== undefined) {
      if (!isValidAcademicYear(props.academicYear)) {
        throw new Error(
          `O ano letivo deve ser um número inteiro entre ${MIN_ACADEMIC_YEAR} e ${MAX_ACADEMIC_YEAR}.`,
        );
      }
      this._academicYear = props.academicYear;
    }

    this._updatedAt = now;
  }

  public setActive(isActive: boolean, now: Date = new Date()): void {
    this._isActive = isActive;
    this._updatedAt = now;
  }

  public toDTO(): ClassGroupDTO {
    return {
      id: this.id,
      code: this.code,
      name: this._name,
      academicYear: this._academicYear,
      isActive: this._isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
