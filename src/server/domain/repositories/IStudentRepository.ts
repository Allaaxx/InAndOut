import type { Student } from '../entities/Student';

export interface IStudentRepository {
  findById(id: string): Promise<Student | null>;
  findByRa(ra: string): Promise<Student | null>;
  findByClassCode(classCode: string): Promise<Student[]>;
  findAll(): Promise<Student[]>;
  save(student: Student): Promise<void>;
}
