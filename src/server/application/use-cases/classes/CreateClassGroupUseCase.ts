import {
  ClassGroup,
  isValidAcademicYear,
  MAX_ACADEMIC_YEAR,
  MIN_ACADEMIC_YEAR,
  normalizeClassCode,
} from '@server/domain/entities/ClassGroup';
import type { IClassGroupRepository } from '@server/domain/repositories/IClassGroupRepository';
import type {
  CreateClassGroupRequestDTO,
  CreateClassGroupResponseDTO,
} from '@shared/dtos';

export class ClassGroupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClassGroupValidationError';
  }
}

export class ClassGroupConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClassGroupConflictError';
  }
}

export interface CreateClassGroupUseCaseOptions {
  clock?: () => Date;
}

export class CreateClassGroupUseCase {
  private readonly clock: () => Date;

  constructor(
    private readonly classGroupRepo: IClassGroupRepository,
    options: CreateClassGroupUseCaseOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: CreateClassGroupRequestDTO,
  ): Promise<CreateClassGroupResponseDTO> {
    const rawCode = typeof input?.code === 'string' ? input.code : '';
    const rawName = typeof input?.name === 'string' ? input.name : '';

    const normalizedCode = normalizeClassCode(rawCode);
    if (!normalizedCode) {
      throw new ClassGroupValidationError('O código da turma é obrigatório.');
    }

    const trimmedName = rawName.trim();
    if (!trimmedName) {
      throw new ClassGroupValidationError('O nome da turma é obrigatório.');
    }

    if (!isValidAcademicYear(input?.academicYear)) {
      throw new ClassGroupValidationError(
        `O ano letivo deve ser um número inteiro entre ${MIN_ACADEMIC_YEAR} e ${MAX_ACADEMIC_YEAR}.`,
      );
    }

    const existing = await this.classGroupRepo.findByCodeAndYear(
      normalizedCode,
      input.academicYear,
    );
    if (existing) {
      throw new ClassGroupConflictError(
        `Já existe uma turma cadastrada com o código "${normalizedCode}" para o ano letivo ${input.academicYear}.`,
      );
    }

    const now = this.clock();
    const classGroup = ClassGroup.create({
      code: normalizedCode,
      name: trimmedName,
      academicYear: input.academicYear,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await this.classGroupRepo.save(classGroup);

    return {
      classGroup: classGroup.toDTO(),
    };
  }
}
