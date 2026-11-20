import type { ClassGroup } from '../entities/ClassGroup';

export interface ListClassGroupsFilter {
  onlyActive?: boolean;
  academicYear?: number;
}

export interface IClassGroupRepository {
  findById(id: string): Promise<ClassGroup | null>;
  findByCodeAndYear(
    code: string,
    academicYear: number,
  ): Promise<ClassGroup | null>;
  findAll(filter?: ListClassGroupsFilter): Promise<ClassGroup[]>;
  save(classGroup: ClassGroup): Promise<void>;
}
