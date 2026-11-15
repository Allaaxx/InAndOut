import type {
  PrismaClient,
  WaitingQueueEntry as PrismaQueueModel,
} from '@prisma/client';
import { WaitingQueueEntry } from '@server/domain/entities/WaitingQueueEntry';
import type { IWaitingQueueRepository } from '@server/domain/repositories/IWaitingQueueRepository';
import { getPrismaClient } from '@server/infrastructure/database/prismaClient';
import { QueueEntryStatus } from '@shared/enums';

const ACTIVE_QUEUE_STATUSES: string[] = [
  QueueEntryStatus.WAITING,
  QueueEntryStatus.CALLED,
];

export class PrismaWaitingQueueRepository implements IWaitingQueueRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? getPrismaClient();
  }

  public async save(entry: WaitingQueueEntry): Promise<void> {
    const data = {
      sessionId: entry.sessionId,
      studentRa: entry.studentRa,
      studentFullName: entry.studentFullName,
      studentPublicName: entry.studentPublicName,
      position: entry.position,
      status: entry.status,
      enqueuedAt: entry.requestedAt,
      calledAt: entry.calledAt ?? null,
      expiresAt: entry.expiresAt ?? null,
    };

    await this.prisma.waitingQueueEntry.upsert({
      where: { id: entry.id },
      create: {
        id: entry.id,
        ...data,
      },
      update: data,
    });
  }

  public async update(entry: WaitingQueueEntry): Promise<void> {
    await this.save(entry);
  }

  public async findById(id: string): Promise<WaitingQueueEntry | null> {
    const row = await this.prisma.waitingQueueEntry.findUnique({
      where: { id },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findActiveBySessionId(
    sessionId: string,
  ): Promise<WaitingQueueEntry[]> {
    const rows = await this.prisma.waitingQueueEntry.findMany({
      where: {
        sessionId,
        status: { in: ACTIVE_QUEUE_STATUSES },
      },
      orderBy: [{ enqueuedAt: 'asc' }, { position: 'asc' }],
    });

    const active = rows.map((r) => this.toDomain(r));
    active.forEach((entry, index) => {
      entry.setPosition(index + 1);
    });
    return active;
  }

  public async findActiveByStudentRa(
    ra: string,
    sessionId?: string,
  ): Promise<WaitingQueueEntry | null> {
    const normalized = ra.trim();
    const row = await this.prisma.waitingQueueEntry.findFirst({
      where: {
        studentRa: normalized,
        status: { in: ACTIVE_QUEUE_STATUSES },
        ...(sessionId ? { sessionId } : {}),
      },
      orderBy: { enqueuedAt: 'desc' },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findBySessionId(
    sessionId: string,
  ): Promise<WaitingQueueEntry[]> {
    const rows = await this.prisma.waitingQueueEntry.findMany({
      where: { sessionId },
      orderBy: [{ enqueuedAt: 'asc' }, { position: 'asc' }],
    });
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(row: PrismaQueueModel): WaitingQueueEntry {
    return WaitingQueueEntry.create({
      id: row.id,
      sessionId: row.sessionId,
      studentRa: row.studentRa,
      studentFullName: row.studentFullName,
      studentPublicName: row.studentPublicName ?? undefined,
      position: row.position,
      status: row.status as QueueEntryStatus,
      requestedAt: row.enqueuedAt,
      calledAt: row.calledAt ?? undefined,
      expiresAt: row.expiresAt ?? undefined,
    });
  }
}
