import type {
  Prisma,
  PrismaClient,
  Student as PrismaStudentModel,
} from '@prisma/client';
import { normalizeClassCode } from '@server/domain/entities/ClassGroup';
import { Student } from '@server/domain/entities/Student';
import type {
  IStudentRepository,
  ListStudentsFilter,
} from '@server/domain/repositories/IStudentRepository';
import { getPrismaClient } from '@server/infrastructure/database/prismaClient';

export class PrismaStudentRepository implements IStudentRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? getPrismaClient();
  }

  public async findById(id: string): Promise<Student | null> {
    const row = await this.prisma.student.findUnique({
      where: { id },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findByRa(ra: string): Promise<Student | null> {
    const normalized = ra.trim();
    const row = await this.prisma.student.findUnique({
      where: { ra: normalized },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findByClassCode(classCode: string): Promise<Student[]> {
    const normalized = normalizeClassCode(classCode);
    const rows = await this.prisma.student.findMany({
      where: { classCode: normalized },
      orderBy: { fullName: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  public async findAll(filter?: ListStudentsFilter): Promise<Student[]> {
    const where: Prisma.StudentWhereInput = {};

    if (filter?.search?.trim()) {
      const term = filter.search.trim();
      where.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { ra: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (filter?.classGroupId?.trim()) {
      where.classGroupId = filter.classGroupId.trim();
    }

    if (filter?.classCode?.trim()) {
      where.classCode = normalizeClassCode(filter.classCode);
    }

    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    const rows = await this.prisma.student.findMany({
      where,
      orderBy: { fullName: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  public async save(student: Student): Promise<void> {
    const data = {
      ra: student.ra,
      fullName: student.fullName,
      classGroupId: student.classGroupId ?? null,
      classCode: student.classCode,
      hasSpecialCondition: student.hasSpecialTimeLimit(),
      specialLimitMinutes: student.specialTimeLimitMinutes ?? null,
      isActive: student.isActive,
      updatedAt: student.updatedAt,
    };

    await this.prisma.student.upsert({
      where: { id: student.id },
      create: {
        id: student.id,
        ...data,
        createdAt: student.createdAt,
      },
      update: data,
    });
  }

  private toDomain(row: PrismaStudentModel): Student {
    return Student.create({
      id: row.id,
      ra: row.ra,
      fullName: row.fullName,
      classGroupId: row.classGroupId ?? undefined,
      classCode: row.classCode,
      specialTimeLimitMinutes: row.specialLimitMinutes ?? undefined,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
