import { PrismaClient, Student as PrismaStudentModel } from '@prisma/client';
import { Student } from '@server/domain/entities/Student';
import { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
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
    const normalized = classCode.trim();
    const rows = await this.prisma.student.findMany({
      where: { classCode: normalized },
      orderBy: { fullName: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  public async findAll(): Promise<Student[]> {
    const rows = await this.prisma.student.findMany({
      orderBy: { fullName: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  public async save(student: Student): Promise<void> {
    const data = {
      ra: student.ra,
      fullName: student.fullName,
      classCode: student.classCode,
      hasSpecialCondition: student.hasSpecialTimeLimit(),
      specialLimitMinutes: student.specialTimeLimitMinutes ?? null,
    };

    await this.prisma.student.upsert({
      where: { id: student.id },
      create: {
        id: student.id,
        ...data,
      },
      update: data,
    });
  }

  private toDomain(row: PrismaStudentModel): Student {
    return Student.create({
      id: row.id,
      ra: row.ra,
      fullName: row.fullName,
      classCode: row.classCode,
      specialTimeLimitMinutes: row.specialLimitMinutes ?? undefined,
    });
  }
}
