import type { IClassGroupRepository } from '@server/domain/repositories/IClassGroupRepository';
import type { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import type { UpdateClassGroupStatusResponseDTO } from '@shared/dtos';
import {
  ClassGroupConflictError,
  ClassGroupValidationError,
} from './CreateClassGroupUseCase';
import { ClassGroupNotFoundError } from './UpdateClassGroupUseCase';

export interface UpdateClassGroupStatusInput {
  classGroupId: string;
  isActive: unknown;
}

export interface UpdateClassGroupStatusUseCaseOptions {
  clock?: () => Date;
  sessionRepo?: IClassSessionRepository;
}

export class UpdateClassGroupStatusUseCase {
  private readonly clock: () => Date;
  private readonly sessionRepo?: IClassSessionRepository;

  constructor(
    private readonly classGroupRepo: IClassGroupRepository,
    options: UpdateClassGroupStatusUseCaseOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.sessionRepo = options.sessionRepo;
  }

  public async execute(
    input: UpdateClassGroupStatusInput,
  ): Promise<UpdateClassGroupStatusResponseDTO> {
    if (typeof input.isActive !== 'boolean') {
      throw new ClassGroupValidationError(
        'O campo isActive deve ser um valor booleano.',
      );
    }

    const classGroup = await this.classGroupRepo.findById(input.classGroupId);
    if (!classGroup) {
      throw new ClassGroupNotFoundError('Turma não encontrada.');
    }

    if (!input.isActive && this.sessionRepo) {
      const activeSession = await this.sessionRepo.findActiveByClassGroupId(
        classGroup.id,
      );
      if (activeSession) {
        throw new ClassGroupConflictError(
          `Não é possível desativar a turma ${classGroup.code} (${classGroup.academicYear}) enquanto houver uma sessão de aula ativa na sala ${activeSession.roomId}.`,
        );
      }
    }

    classGroup.setActive(input.isActive, this.clock());
    await this.classGroupRepo.save(classGroup);

    return {
      classGroup: classGroup.toDTO(),
    };
  }
}
