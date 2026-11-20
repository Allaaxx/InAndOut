import type {
  ClassGroup as PrismaClassGroupModel,
  PrismaClient,
} from '@prisma/client';
import {
  ClassGroup,
  normalizeClassCode,
} from '@server/domain/entities/ClassGroup';
import type {
  IClassGroupRepository,
  ListClassGroupsFilter,
} from '@server/domain/repositories/IClassGroupRepository';
import { getPrismaClient } from '@server/infrastructure/database/prismaClient';

export class PrismaClassGroupRepository implements IClassGroupRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? getPrismaClient();
  }

  public async findById(id: string): Promise<ClassGroup | null> {
    const row = await this.prisma.classGroup.findUnique({
      where: { id },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findByCodeAndYear(
    code: string,
    academicYear: number,
  ): Promise<ClassGroup | null> {
    const normalized = normalizeClassCode(code);
    const row = await this.prisma.classGroup.findUnique({
      where: {
        code_academicYear: {
          code: normalized,
          academicYear,
        },
      },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findAll(filter?: ListClassGroupsFilter): Promise<ClassGroup[]> {
    const where: { isActive?: boolean; academicYear?: number } = {};
    if (filter?.onlyActive) {
      where.isActive = true;
    }
    if (filter?.academicYear !== undefined) {
      where.academicYear = filter.academicYear;
    }

    const rows = await this.prisma.classGroup.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [{ academicYear: 'desc' }, { code: 'asc' }],
    });
    return rows.map((row) => this.toDomain(row));
  }

  public async save(classGroup: ClassGroup): Promise<void> {
    const data = {
      code: classGroup.code,
      name: classGroup.name,
      academicYear: classGroup.academicYear,
      isActive: classGroup.isActive,
    };

    await this.prisma.classGroup.upsert({
      where: { id: classGroup.id },
      create: {
        id: classGroup.id,
        ...data,
        createdAt: classGroup.createdAt,
        updatedAt: classGroup.updatedAt,
      },
      update: {
        ...data,
        updatedAt: classGroup.updatedAt,
      },
    });
  }

  private toDomain(row: PrismaClassGroupModel): ClassGroup {
    return ClassGroup.create({
      id: row.id,
      code: row.code,
      name: row.name,
      academicYear: row.academicYear,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
