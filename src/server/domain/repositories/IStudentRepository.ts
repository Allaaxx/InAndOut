import type { Student } from '../entities/Student';

export interface ListStudentsFilter {
  search?: string;
  classGroupId?: string;
  classCode?: string;
  isActive?: boolean;
}

export interface IStudentRepository {
  findById(id: string): Promise<Student | null>;
  findByRa(ra: string): Promise<Student | null>;
  findByClassCode(classCode: string): Promise<Student[]>;
  findAll(filter?: ListStudentsFilter): Promise<Student[]>;
  save(student: Student): Promise<void>;
}
