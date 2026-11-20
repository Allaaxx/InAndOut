import { normalizeClassCode } from '@server/domain/entities/ClassGroup';
import { Student } from '@server/domain/entities/Student';
import type {
  IStudentRepository,
  ListStudentsFilter,
} from '@server/domain/repositories/IStudentRepository';

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
        classGroupId: 'class-2026-1a',
        classCode: '1A',
        isActive: true,
      }),
      Student.create({
        id: 'student-2',
        ra: '1002',
        fullName: 'João Mendes',
        classGroupId: 'class-2026-1a',
        classCode: '1A',
        isActive: true,
      }),
      Student.create({
        id: 'student-3',
        ra: '1003',
        fullName: 'Ana Costa',
        classGroupId: 'class-2026-1a',
        classCode: '1A',
        specialTimeLimitMinutes: 20,
        isActive: true,
      }),
      Student.create({
        id: 'student-4',
        ra: '2001',
        fullName: 'Pedro Alves',
        classGroupId: 'class-2026-2b',
        classCode: '2B',
        isActive: true,
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
    const normalized = normalizeClassCode(classCode);
    return Array.from(this.students.values()).filter(
      (s) => normalizeClassCode(s.classCode) === normalized,
    );
  }

  public async findAll(filter?: ListStudentsFilter): Promise<Student[]> {
    let result = Array.from(this.students.values());

    if (filter?.search?.trim()) {
      const term = filter.search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.fullName.toLowerCase().includes(term) ||
          s.ra.toLowerCase().includes(term),
      );
    }

    if (filter?.classGroupId?.trim()) {
      const targetId = filter.classGroupId.trim();
      result = result.filter((s) => s.classGroupId === targetId);
    }

    if (filter?.classCode?.trim()) {
      const targetCode = normalizeClassCode(filter.classCode);
      result = result.filter(
        (s) => normalizeClassCode(s.classCode) === targetCode,
      );
    }

    if (filter?.isActive !== undefined) {
      result = result.filter((s) => s.isActive === filter.isActive);
    }

    return result.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  public async save(student: Student): Promise<void> {
    this.students.set(student.id, student);
  }
}
