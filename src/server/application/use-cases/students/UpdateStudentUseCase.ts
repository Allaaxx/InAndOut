import type { IClassGroupRepository } from '@server/domain/repositories/IClassGroupRepository';
import type { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import type { UpdateStudentResponseDTO } from '@shared/dtos';
import {
  resolveActiveClassGroup,
  resolveSpecialLimitMinutes,
  StudentValidationError,
} from './CreateStudentUseCase';

export class StudentCatalogNotFoundError extends Error {
  constructor(message = 'Aluno não encontrado.') {
    super(message);
    this.name = 'StudentCatalogNotFoundError';
  }
}

export interface UpdateStudentInput {
  studentId: string;
  ra?: unknown;
  fullName?: unknown;
  classGroupId?: unknown;
  classCode?: unknown;
  hasSpecialCondition?: unknown;
  specialLimitMinutes?: unknown;
  specialTimeLimitMinutes?: unknown;
}

export interface UpdateStudentUseCaseOptions {
  clock?: () => Date;
}

export class UpdateStudentUseCase {
  private readonly clock: () => Date;

  constructor(
    private readonly studentRepo: IStudentRepository,
    private readonly classGroupRepo: IClassGroupRepository,
    options: UpdateStudentUseCaseOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: UpdateStudentInput,
  ): Promise<UpdateStudentResponseDTO> {
    const existing = await this.studentRepo.findById(input.studentId);
    if (!existing) {
      throw new StudentCatalogNotFoundError('Aluno não encontrado.');
    }

    if (input.ra !== undefined) {
      const submittedRa = typeof input.ra === 'string' ? input.ra.trim() : '';
      if (submittedRa !== existing.ra) {
        throw new StudentValidationError(
          'O RA do aluno é imutável e não pode ser alterado após o cadastro.',
        );
      }
    }

    const hasFullName = input.fullName !== undefined;
    const hasClassTransfer =
      input.classGroupId !== undefined || input.classCode !== undefined;
    const hasSpecialUpdate =
      input.hasSpecialCondition !== undefined ||
      input.specialLimitMinutes !== undefined ||
      input.specialTimeLimitMinutes !== undefined;

    if (!hasFullName && !hasClassTransfer && !hasSpecialUpdate) {
      throw new StudentValidationError(
        'Informe ao menos um campo válido para atualizar o aluno.',
      );
    }

    let validatedFullName: string | undefined;
    if (hasFullName) {
      if (typeof input.fullName !== 'string' || !input.fullName.trim()) {
        throw new StudentValidationError(
          'O nome completo do aluno é obrigatório.',
        );
      }
      validatedFullName = input.fullName.trim();
    }

    let targetClassGroupId: string | undefined;
    let targetClassCode: string | undefined;
    if (hasClassTransfer) {
      const classGroup = await resolveActiveClassGroup(
        this.classGroupRepo,
        typeof input.classGroupId === 'string' ? input.classGroupId : undefined,
        typeof input.classCode === 'string' ? input.classCode : undefined,
      );
      targetClassGroupId = classGroup.id;
      targetClassCode = classGroup.code;
    }

    let specialTimeLimitMinutes: number | null | undefined;
    if (hasSpecialUpdate) {
      const rawMinutes =
        input.specialLimitMinutes !== undefined
          ? input.specialLimitMinutes
          : input.specialTimeLimitMinutes;

      if (
        input.hasSpecialCondition === false ||
        (input.hasSpecialCondition === undefined && rawMinutes === null)
      ) {
        specialTimeLimitMinutes = null;
      } else {
        const effectiveMinutes =
          rawMinutes !== undefined
            ? rawMinutes
            : input.hasSpecialCondition === true
              ? existing.specialTimeLimitMinutes
              : undefined;

        const resolved = resolveSpecialLimitMinutes({
          hasSpecialCondition: input.hasSpecialCondition,
          specialLimitMinutes: effectiveMinutes,
        });
        specialTimeLimitMinutes = resolved ?? null;
      }
    }

    existing.update(
      {
        fullName: validatedFullName,
        classGroupId: targetClassGroupId,
        classCode: targetClassCode,
        specialTimeLimitMinutes,
      },
      this.clock(),
    );

    await this.studentRepo.save(existing);

    return {
      student: existing.toDTO(),
    };
  }
}
