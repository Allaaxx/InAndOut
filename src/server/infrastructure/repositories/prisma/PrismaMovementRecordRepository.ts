import type {
  PrismaClient,
  MovementRecord as PrismaMovementModel,
} from '@prisma/client';
import { MovementRecord } from '@server/domain/entities/MovementRecord';
import type { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import { getPrismaClient } from '@server/infrastructure/database/prismaClient';
import { type IncidentOutcome, MovementStatus } from '@shared/enums';

const ACTIVE_STATUSES: string[] = [
  MovementStatus.IN_TRANSIT,
  MovementStatus.OVERDUE,
  MovementStatus.ESCALATED_TO_COORDINATION,
];

export class PrismaMovementRecordRepository
  implements IMovementRecordRepository
{
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? getPrismaClient();
  }

  public async save(record: MovementRecord): Promise<void> {
    const data = {
      sessionId: record.sessionId,
      studentId: record.studentId,
      studentRa: record.studentRa,
      studentFullName: record.studentFullName,
      studentPublicName: record.studentPublicName,
      classCode: record.classCode,
      subject: record.subject,
      roomId: record.roomId ?? null,
      teacherName: record.teacherName ?? null,
      startedAt: record.startedAt,
      returnedAt: record.endedAt ?? null,
      durationMinutes: record.durationMinutes ?? null,
      allowedLimitMinutes: record.allowedLimitMinutes,
      status: record.status,
      outcome: record.outcome ?? null,
      escalatedAt: record.escalatedAt ?? null,
      escalatedReason: record.resolutionNotes ?? null,
      resolutionNotes: record.resolutionNotes ?? null,
      resolvedBy: record.resolvedByUserId ?? null,
      resolvedAt: record.resolvedAt ?? null,
      attendancePercentage: record.attendancePercentage ?? null,
      attendedMinutes: record.attendedMinutes ?? null,
      isEmergency: record.isEmergency,
      isGuest: record.isGuest,
      authorizedByTeacherId: record.authorizedByTeacherId ?? null,
      overdueAt: record.overdueAt ?? null,
      escalationType: record.escalationType ?? null,
    };

    await this.prisma.movementRecord.upsert({
      where: { id: record.id },
      create: {
        id: record.id,
        ...data,
      },
      update: data,
    });
  }

  public async update(record: MovementRecord): Promise<void> {
    await this.save(record);
  }

  public async findById(id: string): Promise<MovementRecord | null> {
    const row = await this.prisma.movementRecord.findUnique({
      where: { id },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findActiveBySessionId(
    sessionId: string,
  ): Promise<MovementRecord[]> {
    const rows = await this.prisma.movementRecord.findMany({
      where: {
        sessionId,
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: { startedAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  public async findActiveByStudentRa(
    ra: string,
    sessionId?: string,
  ): Promise<MovementRecord | null> {
    const normalized = ra.trim();
    const row = await this.prisma.movementRecord.findFirst({
      where: {
        studentRa: normalized,
        status: { in: ACTIVE_STATUSES },
        ...(sessionId ? { sessionId } : {}),
      },
      orderBy: { startedAt: 'desc' },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findBySessionId(sessionId: string): Promise<MovementRecord[]> {
    const rows = await this.prisma.movementRecord.findMany({
      where: { sessionId },
      orderBy: { startedAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  public async findByStudentRa(ra: string): Promise<MovementRecord[]> {
    const normalized = ra.trim();
    const rows = await this.prisma.movementRecord.findMany({
      where: { studentRa: normalized },
      orderBy: { startedAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  public async findAllActive(): Promise<MovementRecord[]> {
    const rows = await this.prisma.movementRecord.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      orderBy: { startedAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  public async findAll(): Promise<MovementRecord[]> {
    const rows = await this.prisma.movementRecord.findMany({
      orderBy: { startedAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(row: PrismaMovementModel): MovementRecord {
    return MovementRecord.create({
      id: row.id,
      sessionId: row.sessionId,
      studentId: row.studentId ?? undefined,
      studentRa: row.studentRa,
      studentFullName: row.studentFullName,
      studentPublicName: row.studentPublicName ?? undefined,
      classCode: row.classCode,
      subject: row.subject,
      roomId: row.roomId ?? undefined,
      teacherName: row.teacherName ?? undefined,
      status: row.status as MovementStatus,
      startedAt: row.startedAt,
      endedAt: row.returnedAt ?? undefined,
      allowedLimitMinutes: row.allowedLimitMinutes,
      durationMinutes: row.durationMinutes ?? undefined,
      attendedMinutes: row.attendedMinutes ?? undefined,
      attendancePercentage: row.attendancePercentage ?? undefined,
      isEmergency: row.isEmergency,
      isGuest: row.isGuest,
      authorizedByTeacherId: row.authorizedByTeacherId ?? undefined,
      overdueAt: row.overdueAt ?? undefined,
      escalatedAt: row.escalatedAt ?? undefined,
      escalationType: row.escalationType as 'MANUAL' | 'AUTOMATIC' | undefined,
      outcome: (row.outcome as IncidentOutcome) ?? undefined,
      resolutionNotes: row.resolutionNotes ?? row.escalatedReason ?? undefined,
      resolvedByUserId: row.resolvedBy ?? undefined,
      resolvedAt: row.resolvedAt ?? undefined,
    });
  }
}
