import type { IRoomRepository } from '@server/domain/repositories/IRoomRepository';
import type { ListRoomsResponseDTO } from '@shared/dtos';

export interface ListRoomsInput {
  onlyActive?: boolean;
}

export class ListRoomsUseCase {
  constructor(private readonly roomRepo: IRoomRepository) {}

  public async execute(
    input: ListRoomsInput = {},
  ): Promise<ListRoomsResponseDTO> {
    const rooms = await this.roomRepo.findAll({
      onlyActive: input.onlyActive,
    });
    return {
      rooms: rooms.map((room) => room.toDTO()),
    };
  }
}
