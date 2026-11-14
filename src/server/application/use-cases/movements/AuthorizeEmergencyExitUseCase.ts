import { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import { INotificationSender } from '@server/application/contracts/INotificationSender';
import {
  EmergencyExitRequestDTO,
  RequestExitResponseDTO,
} from '@shared/dtos';
import { RequestStudentExitUseCase } from './RequestStudentExitUseCase';

export class MovementAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MovementAuthorizationError';
  }
}

export interface AuthorizeEmergencyExitInput extends EmergencyExitRequestDTO {
  authorizedByTeacherId: string;
}

export class AuthorizeEmergencyExitUseCase {
  private readonly requestExitUseCase: RequestStudentExitUseCase;

  constructor(
    sessionRepo: IClassSessionRepository,
    studentRepo: IStudentRepository,
    movementRepo: IMovementRecordRepository,
    notificationSender: INotificationSender,
    options: { clock?: () => Date } = {}
  ) {
    this.requestExitUseCase = new RequestStudentExitUseCase(
      sessionRepo,
      studentRepo,
      movementRepo,
      notificationSender,
      options
    );
  }

  public async execute(
    input: AuthorizeEmergencyExitInput
  ): Promise<RequestExitResponseDTO> {
    const teacherId = (input.authorizedByTeacherId ?? '').trim();
    if (!teacherId) {
      throw new MovementAuthorizationError(
        'A liberação de emergência exige autorização e identificação do professor responsável.'
      );
    }

    return this.requestExitUseCase.execute({
      ra: input.ra,
      sessionId: input.sessionId,
      roomId: input.roomId,
      isEmergency: true,
      authorizedByTeacherId: teacherId,
    });
  }
}
