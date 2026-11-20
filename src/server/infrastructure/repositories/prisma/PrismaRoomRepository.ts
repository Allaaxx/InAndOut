import type { PrismaClient, Room as PrismaRoomModel } from '@prisma/client';
import { normalizeRoomCode, Room } from '@server/domain/entities/Room';
import type {
  IRoomRepository,
  ListRoomsFilter,
} from '@server/domain/repositories/IRoomRepository';
import { getPrismaClient } from '@server/infrastructure/database/prismaClient';

export class PrismaRoomRepository implements IRoomRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? getPrismaClient();
  }

  public async findById(id: string): Promise<Room | null> {
    const row = await this.prisma.room.findUnique({
      where: { id },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findByCode(code: string): Promise<Room | null> {
    const normalized = normalizeRoomCode(code);
    const row = await this.prisma.room.findUnique({
      where: { code: normalized },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findAll(filter?: ListRoomsFilter): Promise<Room[]> {
    const rows = await this.prisma.room.findMany({
      where: filter?.onlyActive ? { isActive: true } : undefined,
      orderBy: { code: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  public async save(room: Room): Promise<void> {
    const data = {
      code: room.code,
      name: room.name,
      isActive: room.isActive,
    };

    await this.prisma.room.upsert({
      where: { id: room.id },
      create: {
        id: room.id,
        ...data,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      },
      update: {
        ...data,
        updatedAt: room.updatedAt,
      },
    });
  }

  private toDomain(row: PrismaRoomModel): Room {
    return Room.create({
      id: row.id,
      code: row.code,
      name: row.name,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
