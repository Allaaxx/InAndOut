import { Student } from '@server/domain/entities/Student';
import { IStudentRepository } from '@server/domain/repositories/IStudentRepository';

export class InMemoryStudentRepository implements IStudentRepository {
  private students: Map<string, Student> = new Map();

  constructor(seedDefault = true) {
    if (seedDefault) {
      this.seed();
    }
  }

  private seed(): void {
    const defaults: Student[] = [
      Student.create({
        id: 'student-1',
        ra: '1001',
        fullName: 'Lucas Silva',
        classCode: '1A',
      }),
      Student.create({
        id: 'student-2',
        ra: '1002',
        fullName: 'João Mendes',
        classCode: '1A',
      }),
      Student.create({
        id: 'student-3',
        ra: '1003',
        fullName: 'Ana Costa',
        classCode: '1A',
        specialTimeLimitMinutes: 20,
      }),
      Student.create({
        id: 'student-4',
        ra: '2001',
        fullName: 'Pedro Alves',
        classCode: '2B',
      }),
    ];

    for (const student of defaults) {
      this.students.set(student.id, student);
    }
  }

  public async findById(id: string): Promise<Student | null> {
    return this.students.get(id) ?? null;
  }

  public async findByRa(ra: string): Promise<Student | null> {
    const normalized = ra.trim();
    for (const student of this.students.values()) {
      if (student.ra === normalized) {
        return student;
      }
    }
    return null;
  }

  public async findByClassCode(classCode: string): Promise<Student[]> {
    const normalized = classCode.trim();
    return Array.from(this.students.values()).filter(
      (s) => s.classCode === normalized
    );
  }

  public async findAll(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  public async save(student: Student): Promise<void> {
    this.students.set(student.id, student);
  }
}
