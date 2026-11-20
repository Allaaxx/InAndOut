import type { IRoomRepository } from '@server/domain/repositories/IRoomRepository';
import type { UpdateRoomStatusResponseDTO } from '@shared/dtos';
import { RoomValidationError } from './CreateRoomUseCase';

export class RoomNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomNotFoundError';
  }
}

export interface UpdateRoomStatusInput {
  roomId: string;
  isActive: unknown;
}

export interface UpdateRoomStatusUseCaseOptions {
  clock?: () => Date;
}

export class UpdateRoomStatusUseCase {
  private readonly clock: () => Date;

  constructor(
    private readonly roomRepo: IRoomRepository,
    options: UpdateRoomStatusUseCaseOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: UpdateRoomStatusInput,
  ): Promise<UpdateRoomStatusResponseDTO> {
    if (typeof input.isActive !== 'boolean') {
      throw new RoomValidationError(
        'O campo isActive deve ser um valor booleano.',
      );
    }

    const room = await this.roomRepo.findById(input.roomId);
    if (!room) {
      throw new RoomNotFoundError('Sala de aula não encontrada.');
    }

    room.setActive(input.isActive, this.clock());
    await this.roomRepo.save(room);

    return {
      room: room.toDTO(),
    };
  }
}
