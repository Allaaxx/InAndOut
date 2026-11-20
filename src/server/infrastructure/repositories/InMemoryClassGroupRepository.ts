import {
  ClassGroup,
  normalizeClassCode,
} from '@server/domain/entities/ClassGroup';
import type {
  IClassGroupRepository,
  ListClassGroupsFilter,
} from '@server/domain/repositories/IClassGroupRepository';

export class InMemoryClassGroupRepository implements IClassGroupRepository {
  private classGroups: Map<string, ClassGroup> = new Map();

  constructor(seedDefault = true) {
    if (seedDefault) {
      this.seed();
    }
  }

  private seed(): void {
    const defaults: ClassGroup[] = [
      ClassGroup.create({
        id: 'class-2026-1a',
        code: '1A',
        name: '1º Ano A',
        academicYear: 2026,
        isActive: true,
      }),
      ClassGroup.create({
        id: 'class-2026-1b',
        code: '1B',
        name: '1º Ano B',
        academicYear: 2026,
        isActive: true,
      }),
      ClassGroup.create({
        id: 'class-2026-2a',
        code: '2A',
        name: '2º Ano A',
        academicYear: 2026,
        isActive: true,
      }),
      ClassGroup.create({
        id: 'class-2026-2b',
        code: '2B',
        name: '2º Ano B',
        academicYear: 2026,
        isActive: true,
      }),
      ClassGroup.create({
        id: 'class-2026-3a',
        code: '3A',
        name: '3º Ano A',
        academicYear: 2026,
        isActive: true,
      }),
      ClassGroup.create({
        id: 'class-2026-3b',
        code: '3B',
        name: '3º Ano B',
        academicYear: 2026,
        isActive: true,
      }),
    ];

    for (const classGroup of defaults) {
      this.classGroups.set(classGroup.id, classGroup);
    }
  }

  public async findById(id: string): Promise<ClassGroup | null> {
    return this.classGroups.get(id) ?? null;
  }

  public async findByCodeAndYear(
    code: string,
    academicYear: number,
  ): Promise<ClassGroup | null> {
    const normalized = normalizeClassCode(code);
    for (const classGroup of this.classGroups.values()) {
      if (
        classGroup.code === normalized &&
        classGroup.academicYear === academicYear
      ) {
        return classGroup;
      }
    }
    return null;
  }

  public async findAll(filter?: ListClassGroupsFilter): Promise<ClassGroup[]> {
    let result = Array.from(this.classGroups.values());

    if (filter?.onlyActive) {
      result = result.filter((item) => item.isActive);
    }

    if (filter?.academicYear !== undefined) {
      result = result.filter(
        (item) => item.academicYear === filter.academicYear,
      );
    }

    return result.sort((a, b) => {
      if (b.academicYear !== a.academicYear) {
        return b.academicYear - a.academicYear;
      }
      return a.code.localeCompare(b.code);
    });
  }

  public async save(classGroup: ClassGroup): Promise<void> {
    this.classGroups.set(classGroup.id, classGroup);
  }
}
