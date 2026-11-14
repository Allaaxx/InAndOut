import { Student } from '@server/domain/entities/Student';
import { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import { StudentRA } from '@server/domain/value-objects/StudentRA';
import { INotificationSender } from '@server/application/contracts/INotificationSender';
import {
  GuestExitRequestDTO,
  RequestExitResponseDTO,
} from '@shared/dtos';
import {
  MovementValidationError,
  RequestStudentExitUseCase,
} from './RequestStudentExitUseCase';
import { MovementAuthorizationError } from './AuthorizeEmergencyExitUseCase';

export interface AuthorizeGuestExitInput extends GuestExitRequestDTO {
  authorizedByTeacherId: string;
}

export class AuthorizeGuestExitUseCase {
  private readonly studentRepo: IStudentRepository;
  private readonly requestExitUseCase: RequestStudentExitUseCase;

  constructor(
    sessionRepo: IClassSessionRepository,
    studentRepo: IStudentRepository,
    movementRepo: IMovementRecordRepository,
    notificationSender: INotificationSender,
    options: { clock?: () => Date } = {}
  ) {
    this.studentRepo = studentRepo;
    this.requestExitUseCase = new RequestStudentExitUseCase(
      sessionRepo,
      studentRepo,
      movementRepo,
      notificationSender,
      options
    );
  }

  public async execute(
    input: AuthorizeGuestExitInput
  ): Promise<RequestExitResponseDTO> {
    const teacherId = (input.authorizedByTeacherId ?? '').trim();
    if (!teacherId) {
      throw new MovementAuthorizationError(
        'A autorização de aluno avulso exige permissão e identificação do professor responsável.'
      );
    }

    let raObj: StudentRA;
    try {
      raObj = StudentRA.create(input.ra ?? '');
    } catch (err) {
      throw new MovementValidationError(
        err instanceof Error ? err.message : 'RA inválido.'
      );
    }

    let student = await this.studentRepo.findByRa(raObj.value);
    if (!student) {
      const guestName =
        (input.fullName ?? '').trim() || `Aluno Visitante ${raObj.value}`;
      const originClass =
        (input.originClassCode ?? '').trim() || 'AVULSO';
      student = Student.create({
        ra: raObj,
        fullName: guestName,
        classCode: originClass,
      });
      await this.studentRepo.save(student);
    }

    return this.requestExitUseCase.execute({
      ra: raObj.value,
      sessionId: input.sessionId,
      roomId: input.roomId,
      isGuest: true,
      isEmergency: Boolean(input.forceConcurrent),
      authorizedByTeacherId: teacherId,
    });
  }
}
