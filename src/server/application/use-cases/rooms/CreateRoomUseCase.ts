import { Room } from '@server/domain/entities/Room';
import type { IRoomRepository } from '@server/domain/repositories/IRoomRepository';
import type { CreateRoomRequestDTO, CreateRoomResponseDTO } from '@shared/dtos';
import { normalizeRoomCode } from '@shared/roomCode';

export class RoomValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomValidationError';
  }
}

export class RoomConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomConflictError';
  }
}

export interface CreateRoomUseCaseOptions {
  clock?: () => Date;
}

export class CreateRoomUseCase {
  private readonly clock: () => Date;

  constructor(
    private readonly roomRepo: IRoomRepository,
    options: CreateRoomUseCaseOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: CreateRoomRequestDTO,
  ): Promise<CreateRoomResponseDTO> {
    const rawCode = typeof input?.code === 'string' ? input.code : '';
    const rawName = typeof input?.name === 'string' ? input.name : '';

    const normalizedCode = normalizeRoomCode(rawCode);
    if (!normalizedCode) {
      throw new RoomValidationError('O código da sala é obrigatório.');
    }

    const trimmedName = rawName.trim();
    if (!trimmedName) {
      throw new RoomValidationError('O nome da sala é obrigatório.');
    }

    const existing = await this.roomRepo.findByCode(normalizedCode);
    if (existing) {
      throw new RoomConflictError(
        `Já existe uma sala cadastrada com o código "${normalizedCode}".`,
      );
    }

    const now = this.clock();
    const room = Room.create({
      code: normalizedCode,
      name: trimmedName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await this.roomRepo.save(room);

    return {
      room: room.toDTO(),
    };
  }
}
