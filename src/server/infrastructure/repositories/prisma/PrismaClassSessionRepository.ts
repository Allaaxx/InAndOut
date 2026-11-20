import type {
  ClassSession as PrismaClassSessionModel,
  PrismaClient,
} from '@prisma/client';
import { ClassSession } from '@server/domain/entities/ClassSession';
import type { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import { getPrismaClient } from '@server/infrastructure/database/prismaClient';
import { SessionStatus } from '@shared/enums';
import { resolveRoomCode } from '@shared/roomCode';

export class PrismaClassSessionRepository implements IClassSessionRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? getPrismaClient();
  }

  public async create(session: ClassSession): Promise<void> {
    await this.save(session);
  }

  public async save(session: ClassSession): Promise<void> {
    const data = {
      teacherId: session.teacherId,
      teacherName: session.teacherName,
      roomId: session.roomId,
      classCode: session.classCode,
      subject: session.subject,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt ?? null,
      durationMinutes: session.plannedDurationMinutes,
      defaultTimeLimitMinutes: session.defaultTimeLimitMinutes,
    };

    await this.prisma.classSession.upsert({
      where: { id: session.id },
      create: {
        id: session.id,
        ...data,
      },
      update: data,
    });
  }

  public async update(session: ClassSession): Promise<void> {
    await this.save(session);
  }

  public async findById(id: string): Promise<ClassSession | null> {
    const row = await this.prisma.classSession.findUnique({
      where: { id },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findActiveByRoomId(
    roomId: string,
  ): Promise<ClassSession | null> {
    const normalizedRoom = resolveRoomCode(roomId);
    const row = await this.prisma.classSession.findFirst({
      where: {
        roomId: normalizedRoom,
        status: SessionStatus.ACTIVE,
      },
      orderBy: { startedAt: 'desc' },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findActiveByTeacherId(
    teacherId: string,
  ): Promise<ClassSession | null> {
    const row = await this.prisma.classSession.findFirst({
      where: {
        teacherId,
        status: SessionStatus.ACTIVE,
      },
      orderBy: { startedAt: 'desc' },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findAllActive(): Promise<ClassSession[]> {
    const rows = await this.prisma.classSession.findMany({
      where: { status: SessionStatus.ACTIVE },
      orderBy: { startedAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  public async findAll(): Promise<ClassSession[]> {
    const rows = await this.prisma.classSession.findMany({
      orderBy: { startedAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(row: PrismaClassSessionModel): ClassSession {
    return ClassSession.create({
      id: row.id,
      teacherId: row.teacherId,
      teacherName: row.teacherName ?? undefined,
      roomId: row.roomId ?? undefined,
      classCode: row.classCode,
      subject: row.subject,
      status: row.status as SessionStatus,
      startedAt: row.startedAt,
      endedAt: row.endedAt ?? undefined,
      plannedDurationMinutes: row.durationMinutes ?? undefined,
      defaultTimeLimitMinutes: row.defaultTimeLimitMinutes ?? undefined,
    });
  }
}
