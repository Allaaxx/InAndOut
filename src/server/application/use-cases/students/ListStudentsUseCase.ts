import type {
  IStudentRepository,
  ListStudentsFilter,
} from '@server/domain/repositories/IStudentRepository';
import type { ListStudentsResponseDTO } from '@shared/dtos';

export interface ListStudentsInput {
  search?: string;
  classGroupId?: string;
  classCode?: string;
  isActive?: boolean;
}

export class ListStudentsUseCase {
  constructor(private readonly studentRepo: IStudentRepository) {}

  public async execute(
    input: ListStudentsInput = {},
  ): Promise<ListStudentsResponseDTO> {
    const filter: ListStudentsFilter = {};

    if (input.search?.trim()) {
      filter.search = input.search.trim();
    }
    if (input.classGroupId?.trim()) {
      filter.classGroupId = input.classGroupId.trim();
    }
    if (input.classCode?.trim()) {
      filter.classCode = input.classCode.trim();
    }
    if (input.isActive !== undefined) {
      filter.isActive = input.isActive;
    }

    const students = await this.studentRepo.findAll(filter);
    return {
      students: students.map((student) => student.toDTO()),
    };
  }
}
