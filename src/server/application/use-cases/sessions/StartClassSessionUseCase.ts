import type { INotificationSender } from '@server/application/contracts/INotificationSender';
import { ClassSession } from '@server/domain/entities/ClassSession';
import type { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import type { IRoomRepository } from '@server/domain/repositories/IRoomRepository';
import type {
  StartSessionRequestDTO,
  StartSessionResponseDTO,
} from '@shared/dtos';
import { resolveRoomCode } from '@shared/roomCode';

export class SessionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionConflictError';
  }
}

export class SessionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionValidationError';
  }
}

export interface StartClassSessionInput extends StartSessionRequestDTO {
  teacherId: string;
  teacherName: string;
}

export interface StartClassSessionOptions {
  clock?: () => Date;
  roomRepo?: IRoomRepository;
  notificationSender?: INotificationSender;
}

export class StartClassSessionUseCase {
  private readonly sessionRepo: IClassSessionRepository;
  private readonly roomRepo?: IRoomRepository;
  private readonly notificationSender?: INotificationSender;
  private readonly clock: () => Date;

  constructor(
    sessionRepo: IClassSessionRepository,
    options: StartClassSessionOptions = {},
  ) {
    this.sessionRepo = sessionRepo;
    this.roomRepo = options.roomRepo;
    this.notificationSender = options.notificationSender;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: StartClassSessionInput,
  ): Promise<StartSessionResponseDTO> {
    const classCode = (input.classCode ?? input.className ?? '').trim();
    if (!classCode) {
      throw new SessionValidationError(
        'A turma (classCode) é obrigatória para iniciar a sessão de aula.',
      );
    }

    const subject = (input.subject ?? '').trim();
    if (!subject) {
      throw new SessionValidationError(
        'A disciplina (subject) é obrigatória para iniciar a sessão de aula.',
      );
    }

    const roomId = resolveRoomCode(input.roomId);

    if (this.roomRepo) {
      const room = await this.roomRepo.findByCode(roomId);
      if (!room) {
        throw new SessionValidationError(
          `A sala ${roomId} não está cadastrada no sistema.`,
        );
      }
      if (!room.isActive) {
        throw new SessionValidationError(
          `A sala ${roomId} (${room.name}) está inativa e não pode receber novas sessões de aula.`,
        );
      }
    }

    const existingActiveInRoom =
      await this.sessionRepo.findActiveByRoomId(roomId);
    if (existingActiveInRoom) {
      throw new SessionConflictError(
        `Já existe uma sessão de aula ativa no terminal/sala ${roomId} (${existingActiveInRoom.classCode} — ${existingActiveInRoom.subject}).`,
      );
    }

    const existingActiveByTeacher =
      await this.sessionRepo.findActiveByTeacherId(input.teacherId);
    if (existingActiveByTeacher) {
      throw new SessionConflictError(
        `O professor já possui uma sessão de aula ativa na sala ${existingActiveByTeacher.roomId} (${existingActiveByTeacher.classCode} — ${existingActiveByTeacher.subject}). Encerre a sessão atual antes de iniciar outra.`,
      );
    }

    let session: ClassSession;
    try {
      session = ClassSession.create({
        teacherId: input.teacherId,
        teacherName: input.teacherName,
        roomId,
        classCode,
        subject,
        startedAt: this.clock(),
        plannedDurationMinutes: input.plannedDurationMinutes,
        defaultTimeLimitMinutes:
          input.defaultTimeLimitMinutes ?? input.timeLimitMinutes,
      });
    } catch (err) {
      throw new SessionValidationError(
        err instanceof Error
          ? err.message
          : 'Dados inválidos para iniciar sessão.',
      );
    }

    await this.sessionRepo.create(session);

    const response: StartSessionResponseDTO = {
      session: session.toDTO(),
    };

    if (this.notificationSender?.notifySessionStarted) {
      await this.notificationSender.notifySessionStarted(response.session);
    }

    return response;
  }
}
