import type { IClassGroupRepository } from '@server/domain/repositories/IClassGroupRepository';
import type { ListClassGroupsResponseDTO } from '@shared/dtos';

export interface ListClassGroupsInput {
  onlyActive?: boolean;
  academicYear?: number;
}

export class ListClassGroupsUseCase {
  constructor(private readonly classGroupRepo: IClassGroupRepository) {}

  public async execute(
    input: ListClassGroupsInput = {},
  ): Promise<ListClassGroupsResponseDTO> {
    const classes = await this.classGroupRepo.findAll({
      onlyActive: input.onlyActive,
      academicYear: input.academicYear,
    });
    return {
      classes: classes.map((item) => item.toDTO()),
    };
  }
}
