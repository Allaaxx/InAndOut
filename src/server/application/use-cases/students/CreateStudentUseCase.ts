import {
  type ClassGroup,
  normalizeClassCode,
} from '@server/domain/entities/ClassGroup';
import { Student } from '@server/domain/entities/Student';
import type { IClassGroupRepository } from '@server/domain/repositories/IClassGroupRepository';
import type { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import { StudentRA } from '@server/domain/value-objects/StudentRA';
import type {
  CreateStudentRequestDTO,
  CreateStudentResponseDTO,
} from '@shared/dtos';

export class StudentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudentValidationError';
  }
}

export class StudentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudentConflictError';
  }
}

export async function resolveActiveClassGroup(
  classGroupRepo: IClassGroupRepository,
  classGroupId?: string,
  classCode?: string,
): Promise<ClassGroup> {
  const trimmedId = typeof classGroupId === 'string' ? classGroupId.trim() : '';
  const normalizedCode =
    typeof classCode === 'string' ? normalizeClassCode(classCode) : '';

  if (!trimmedId && !normalizedCode) {
    throw new StudentValidationError(
      'A turma do aluno (classGroupId) é obrigatória.',
    );
  }

  let resolved: ClassGroup | null = null;

  if (trimmedId) {
    resolved = await classGroupRepo.findById(trimmedId);
  } else if (normalizedCode) {
    const activeGroups = await classGroupRepo.findAll({ onlyActive: true });
    resolved =
      activeGroups.find((group) => group.code === normalizedCode) ?? null;
  }

  if (!resolved) {
    throw new StudentValidationError(
      'A turma informada não está cadastrada no catálogo de turmas.',
    );
  }

  if (!resolved.isActive) {
    throw new StudentValidationError(
      `A turma "${resolved.code} (${resolved.academicYear})" está inativa e não aceita novos vínculos.`,
    );
  }

  return resolved;
}

export function resolveSpecialLimitMinutes(input: {
  hasSpecialCondition?: unknown;
  specialLimitMinutes?: unknown;
  specialTimeLimitMinutes?: unknown;
}): number | undefined {
  const rawMinutes =
    input.specialLimitMinutes !== undefined
      ? input.specialLimitMinutes
      : input.specialTimeLimitMinutes;

  if (input.hasSpecialCondition === false) {
    return undefined;
  }

  if (input.hasSpecialCondition === true) {
    if (
      typeof rawMinutes !== 'number' ||
      !Number.isInteger(rawMinutes) ||
      rawMinutes <= 0
    ) {
      throw new StudentValidationError(
        'O Tempo Especial deve ser um número inteiro positivo de minutos.',
      );
    }
    return rawMinutes;
  }

  if (rawMinutes === undefined || rawMinutes === null) {
    return undefined;
  }

  if (
    typeof rawMinutes !== 'number' ||
    !Number.isInteger(rawMinutes) ||
    rawMinutes <= 0
  ) {
    throw new StudentValidationError(
      'O Tempo Especial deve ser um número inteiro positivo de minutos.',
    );
  }

  return rawMinutes;
}

export interface CreateStudentUseCaseOptions {
  clock?: () => Date;
}

export class CreateStudentUseCase {
  private readonly clock: () => Date;

  constructor(
    private readonly studentRepo: IStudentRepository,
    private readonly classGroupRepo: IClassGroupRepository,
    options: CreateStudentUseCaseOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: CreateStudentRequestDTO,
  ): Promise<CreateStudentResponseDTO> {
    const rawRa = typeof input?.ra === 'string' ? input.ra : '';
    let validatedRa: StudentRA;
    try {
      validatedRa = StudentRA.create(rawRa);
    } catch (err) {
      throw new StudentValidationError(
        err instanceof Error ? err.message : 'RA inválido.',
      );
    }

    const fullName =
      typeof input?.fullName === 'string' ? input.fullName.trim() : '';
    if (!fullName) {
      throw new StudentValidationError(
        'O nome completo do aluno é obrigatório.',
      );
    }

    const existing = await this.studentRepo.findByRa(validatedRa.value);
    if (existing) {
      throw new StudentConflictError(
        `Já existe um aluno cadastrado com o RA "${validatedRa.value}".`,
      );
    }

    const classGroup = await resolveActiveClassGroup(
      this.classGroupRepo,
      input?.classGroupId,
      input?.classCode,
    );

    const specialTimeLimitMinutes = resolveSpecialLimitMinutes({
      hasSpecialCondition: input?.hasSpecialCondition,
      specialLimitMinutes: input?.specialLimitMinutes,
      specialTimeLimitMinutes: input?.specialTimeLimitMinutes,
    });

    const now = this.clock();
    const student = Student.create({
      ra: validatedRa,
      fullName,
      classGroupId: classGroup.id,
      classCode: classGroup.code,
      specialTimeLimitMinutes,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await this.studentRepo.save(student);

    return {
      student: student.toDTO(),
    };
  }
}
