import type { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import type { UpdateStudentStatusResponseDTO } from '@shared/dtos';
import { StudentValidationError } from './CreateStudentUseCase';
import { StudentCatalogNotFoundError } from './UpdateStudentUseCase';

export interface UpdateStudentStatusInput {
  studentId: string;
  isActive: unknown;
}

export interface UpdateStudentStatusUseCaseOptions {
  clock?: () => Date;
}

export class UpdateStudentStatusUseCase {
  private readonly clock: () => Date;

  constructor(
    private readonly studentRepo: IStudentRepository,
    options: UpdateStudentStatusUseCaseOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: UpdateStudentStatusInput,
  ): Promise<UpdateStudentStatusResponseDTO> {
    if (typeof input.isActive !== 'boolean') {
      throw new StudentValidationError(
        'O campo isActive deve ser um valor booleano.',
      );
    }

    const student = await this.studentRepo.findById(input.studentId);
    if (!student) {
      throw new StudentCatalogNotFoundError('Aluno não encontrado.');
    }

    student.setActive(input.isActive, this.clock());
    await this.studentRepo.save(student);

    return {
      student: student.toDTO(),
    };
  }
}
