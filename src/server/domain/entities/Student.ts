import { randomUUID } from 'node:crypto';
import { formatPublicStudentName } from '@shared/enums';
import { StudentDTO } from '@shared/dtos';
import { StudentRA } from '../value-objects/StudentRA';

export interface StudentProps {
  id?: string;
  ra: string | StudentRA;
  fullName?: string;
  name?: string;
  classCode?: string;
  className?: string;
  specialTimeLimitMinutes?: number;
}

export class Student {
  public readonly id: string;
  private readonly _ra: StudentRA;
  public readonly fullName: string;
  public readonly classCode: string;
  public readonly specialTimeLimitMinutes?: number;

  private constructor(
    id: string,
    ra: StudentRA,
    fullName: string,
    classCode: string,
    specialTimeLimitMinutes?: number
  ) {
    this.id = id;
    this._ra = ra;
    this.fullName = fullName;
    this.classCode = classCode;
    this.specialTimeLimitMinutes = specialTimeLimitMinutes;
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
      props.specialTimeLimitMinutes <= 0
    ) {
      throw new Error('O Tempo Especial deve ser maior que zero minutos.');
    }

    return new Student(
      props.id ?? randomUUID(),
      raObj,
      fullName,
      classCode,
      props.specialTimeLimitMinutes
    );
  }

  public get ra(): string {
    return this._ra.value;
  }

  public get raObject(): StudentRA {
    return this._ra;
  }

  public get name(): string {
    return this.fullName;
  }

  public get className(): string {
    return this.classCode;
  }

  /**
   * LGPD-compliant abbreviated display name for public classroom terminals (e.g., "Lucas S.")
   */
  public get publicName(): string {
    return formatPublicStudentName(this.fullName);
  }

  /**
   * Alias for LGPD-compliant abbreviated display name (e.g., "Lucas S.")
   */
  public get abbreviatedName(): string {
    return formatPublicStudentName(this.fullName);
  }

  public hasSpecialTimeLimit(): boolean {
    return (
      this.specialTimeLimitMinutes !== undefined &&
      this.specialTimeLimitMinutes > 0
    );
  }

  public getEffectiveTimeLimitMinutes(classDefaultLimitMinutes = 10): number {
    return this.specialTimeLimitMinutes ?? classDefaultLimitMinutes;
  }

  public toDTO(): StudentDTO {
    const pubName = this.publicName;
    return {
      id: this.id,
      ra: this.ra,
      fullName: this.fullName,
      publicName: pubName,
      abbreviatedName: pubName,
      classCode: this.classCode,
      specialTimeLimitMinutes: this.specialTimeLimitMinutes,
    };
  }
}
