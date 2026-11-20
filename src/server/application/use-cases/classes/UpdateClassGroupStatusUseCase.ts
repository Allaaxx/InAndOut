import type { IClassGroupRepository } from '@server/domain/repositories/IClassGroupRepository';
import type { UpdateClassGroupStatusResponseDTO } from '@shared/dtos';
import { ClassGroupValidationError } from './CreateClassGroupUseCase';
import { ClassGroupNotFoundError } from './UpdateClassGroupUseCase';

export interface UpdateClassGroupStatusInput {
  classGroupId: string;
  isActive: unknown;
}

export interface UpdateClassGroupStatusUseCaseOptions {
  clock?: () => Date;
}

export class UpdateClassGroupStatusUseCase {
  private readonly clock: () => Date;

  constructor(
    private readonly classGroupRepo: IClassGroupRepository,
    options: UpdateClassGroupStatusUseCaseOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
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

    classGroup.setActive(input.isActive, this.clock());
    await this.classGroupRepo.save(classGroup);

    return {
      classGroup: classGroup.toDTO(),
    };
  }
}
