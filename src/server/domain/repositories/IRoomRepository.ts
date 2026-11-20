import type { Room } from '../entities/Room';

export interface ListRoomsFilter {
  onlyActive?: boolean;
}

export interface IRoomRepository {
  findById(id: string): Promise<Room | null>;
  findByCode(code: string): Promise<Room | null>;
  findAll(filter?: ListRoomsFilter): Promise<Room[]>;
  save(room: Room): Promise<void>;
}
