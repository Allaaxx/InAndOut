import { Room } from '@server/domain/entities/Room';
import type {
  IRoomRepository,
  ListRoomsFilter,
} from '@server/domain/repositories/IRoomRepository';
import { DEFAULT_ROOM_CODE, normalizeRoomCode } from '@shared/roomCode';

export class InMemoryRoomRepository implements IRoomRepository {
  private rooms: Map<string, Room> = new Map();

  constructor(seedDefault = true) {
    if (seedDefault) {
      this.seed();
    }
  }

  private seed(): void {
    const defaults: Room[] = [
      Room.create({
        id: 'room-sala-01',
        code: DEFAULT_ROOM_CODE,
        name: 'Sala 01',
        isActive: true,
      }),
      Room.create({
        id: 'room-sala-02',
        code: 'SALA-02',
        name: 'Sala 02',
        isActive: true,
      }),
      Room.create({
        id: 'room-sala-03',
        code: 'SALA-03',
        name: 'Sala 03',
        isActive: true,
      }),
      Room.create({
        id: 'room-lab-01',
        code: 'LAB-01',
        name: 'Laboratório 01',
        isActive: true,
      }),
    ];

    for (const room of defaults) {
      this.rooms.set(room.id, room);
    }
  }

  public async findById(id: string): Promise<Room | null> {
    return this.rooms.get(id) ?? null;
  }

  public async findByCode(code: string): Promise<Room | null> {
    const normalized = normalizeRoomCode(code);
    for (const room of this.rooms.values()) {
      if (room.code === normalized) {
        return room;
      }
    }
    return null;
  }

  public async findAll(filter?: ListRoomsFilter): Promise<Room[]> {
    const all = Array.from(this.rooms.values());
    const filtered = filter?.onlyActive ? all.filter((r) => r.isActive) : all;
    return filtered.sort((a, b) => a.code.localeCompare(b.code));
  }

  public async save(room: Room): Promise<void> {
    this.rooms.set(room.id, room);
  }
}
