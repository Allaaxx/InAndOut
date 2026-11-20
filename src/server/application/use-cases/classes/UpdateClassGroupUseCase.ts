import {
  isValidAcademicYear,
  MAX_ACADEMIC_YEAR,
  MIN_ACADEMIC_YEAR,
} from '@server/domain/entities/ClassGroup';
import type { IClassGroupRepository } from '@server/domain/repositories/IClassGroupRepository';
import type { UpdateClassGroupResponseDTO } from '@shared/dtos';
import {
  ClassGroupConflictError,
  ClassGroupValidationError,
} from './CreateClassGroupUseCase';

export class ClassGroupNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClassGroupNotFoundError';
  }
}

export interface UpdateClassGroupInput {
  classGroupId: string;
  name?: unknown;
  academicYear?: unknown;
}

export interface UpdateClassGroupUseCaseOptions {
  clock?: () => Date;
}

export class UpdateClassGroupUseCase {
  private readonly clock: () => Date;

  constructor(
    private readonly classGroupRepo: IClassGroupRepository,
    options: UpdateClassGroupUseCaseOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: UpdateClassGroupInput,
  ): Promise<UpdateClassGroupResponseDTO> {
    const hasName = input.name !== undefined;
    const hasAcademicYear = input.academicYear !== undefined;

    if (!hasName && !hasAcademicYear) {
      throw new ClassGroupValidationError(
        'Informe ao menos o nome ou o ano letivo para atualizar a turma.',
      );
    }

    let validatedName: string | undefined;
    if (hasName) {
      if (typeof input.name !== 'string' || !input.name.trim()) {
        throw new ClassGroupValidationError('O nome da turma é obrigatório.');
      }
      validatedName = input.name.trim();
    }

    let validatedYear: number | undefined;
    if (hasAcademicYear) {
      if (!isValidAcademicYear(input.academicYear)) {
        throw new ClassGroupValidationError(
          `O ano letivo deve ser um número inteiro entre ${MIN_ACADEMIC_YEAR} e ${MAX_ACADEMIC_YEAR}.`,
        );
      }
      validatedYear = input.academicYear;
    }

    const existing = await this.classGroupRepo.findById(input.classGroupId);
    if (!existing) {
      throw new ClassGroupNotFoundError('Turma não encontrada.');
    }

    if (
      validatedYear !== undefined &&
      validatedYear !== existing.academicYear
    ) {
      const conflict = await this.classGroupRepo.findByCodeAndYear(
        existing.code,
        validatedYear,
      );
      if (conflict && conflict.id !== existing.id) {
        throw new ClassGroupConflictError(
          `Já existe uma turma cadastrada com o código "${existing.code}" para o ano letivo ${validatedYear}.`,
        );
      }
    }

    existing.update(
      {
        name: validatedName,
        academicYear: validatedYear,
      },
      this.clock(),
    );

    await this.classGroupRepo.save(existing);

    return {
      classGroup: existing.toDTO(),
    };
  }
}
