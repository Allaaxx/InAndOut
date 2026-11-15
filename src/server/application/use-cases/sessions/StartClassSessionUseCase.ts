import { ClassSession } from '@server/domain/entities/ClassSession';
import type { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import type {
  StartSessionRequestDTO,
  StartSessionResponseDTO,
} from '@shared/dtos';

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

export class StartClassSessionUseCase {
  private readonly sessionRepo: IClassSessionRepository;
  private readonly clock: () => Date;

  constructor(
    sessionRepo: IClassSessionRepository,
    options: { clock?: () => Date } = {},
  ) {
    this.sessionRepo = sessionRepo;
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

    const roomId = (input.roomId ?? 'SALA-01').trim() || 'SALA-01';

    const existingActive = await this.sessionRepo.findActiveByRoomId(roomId);
    if (existingActive) {
      throw new SessionConflictError(
        `Já existe uma sessão de aula ativa no terminal/sala ${roomId} (${existingActive.classCode} — ${existingActive.subject}).`,
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

    return {
      session: session.toDTO(),
    };
  }
}
