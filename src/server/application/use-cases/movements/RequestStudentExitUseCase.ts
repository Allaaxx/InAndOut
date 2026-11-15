import type { INotificationSender } from '@server/application/contracts/INotificationSender';
import type { ClassSession } from '@server/domain/entities/ClassSession';
import { MovementRecord } from '@server/domain/entities/MovementRecord';
import type { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import type { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import type { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import { StudentRA } from '@server/domain/value-objects/StudentRA';
import type {
  RequestExitRequestDTO,
  RequestExitResponseDTO,
} from '@shared/dtos';
import { MovementStatus } from '@shared/enums';

export class MovementValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MovementValidationError';
  }
}

export class MovementNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MovementNotFoundError';
  }
}

export class StudentNotInClassError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudentNotInClassError';
  }
}

export class MovementConcurrencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MovementConcurrencyConflictError';
  }
}

export interface RequestStudentExitInput extends RequestExitRequestDTO {
  isEmergency?: boolean;
  isGuest?: boolean;
  authorizedByTeacherId?: string;
}

export class RequestStudentExitUseCase {
  private readonly sessionRepo: IClassSessionRepository;
  private readonly studentRepo: IStudentRepository;
  private readonly movementRepo: IMovementRecordRepository;
  private readonly notificationSender: INotificationSender;
  private readonly clock: () => Date;

  constructor(
    sessionRepo: IClassSessionRepository,
    studentRepo: IStudentRepository,
    movementRepo: IMovementRecordRepository,
    notificationSender: INotificationSender,
    options: { clock?: () => Date } = {},
  ) {
    this.sessionRepo = sessionRepo;
    this.studentRepo = studentRepo;
    this.movementRepo = movementRepo;
    this.notificationSender = notificationSender;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: RequestStudentExitInput,
  ): Promise<RequestExitResponseDTO> {
    let raObj: StudentRA;
    try {
      raObj = StudentRA.create(input.ra ?? '');
    } catch (err) {
      throw new MovementValidationError(
        err instanceof Error ? err.message : 'RA inválido.',
      );
    }

    let session: ClassSession | null = null;
    if (input.sessionId) {
      session = await this.sessionRepo.findById(input.sessionId);
      if (session && !session.isActive()) {
        session = null;
      }
    } else {
      const roomId = (input.roomId ?? 'SALA-01').trim() || 'SALA-01';
      session = await this.sessionRepo.findActiveByRoomId(roomId);
    }

    if (!session) {
      throw new MovementNotFoundError(
        'Nenhuma sessão de aula ativa foi encontrada para registrar a saída.',
      );
    }

    const student = await this.studentRepo.findByRa(raObj.value);
    if (!student) {
      throw new MovementNotFoundError(
        `Aluno com RA ${raObj.value} não encontrado.`,
      );
    }

    if (!input.isGuest && student.classCode !== session.classCode) {
      throw new StudentNotInClassError(
        `O aluno (${student.publicName}) pertence à turma ${student.classCode} e não está matriculado na turma ativa (${session.classCode}). Solicite Autorização Avulsa ao professor.`,
      );
    }

    const activeMovements = await this.movementRepo.findActiveBySessionId(
      session.id,
    );

    if (!input.isEmergency && activeMovements.length > 0) {
      const currentOut = activeMovements[0];
      throw new MovementConcurrencyConflictError(
        `Sala ocupada: ${currentOut.studentPublicName} já está fora da sala. Apenas 1 estudante pode sair por vez. Aguarde o retorno.`,
      );
    }

    const now = this.clock();
    const allowedLimitMinutes =
      student.specialTimeLimitMinutes ?? session.defaultTimeLimitMinutes;

    const movement = MovementRecord.create({
      sessionId: session.id,
      studentId: student.id,
      studentRa: student.ra,
      studentFullName: student.fullName,
      studentPublicName: student.publicName,
      classCode: session.classCode,
      subject: session.subject,
      roomId: session.roomId,
      teacherName: session.teacherName,
      status: MovementStatus.IN_TRANSIT,
      startedAt: now,
      allowedLimitMinutes,
      isEmergency: input.isEmergency ?? false,
      isGuest: input.isGuest ?? false,
      authorizedByTeacherId: input.authorizedByTeacherId,
    });

    await this.movementRepo.save(movement);

    const dto = movement.toDTO(now);
    await this.notificationSender.notifyMovementExit(dto);

    return {
      movement: dto,
    };
  }
}
