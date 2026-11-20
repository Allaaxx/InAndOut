import type { INotificationSender } from '@server/application/contracts/INotificationSender';
import { Student } from '@server/domain/entities/Student';
import type { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import type { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import type { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import { StudentRA } from '@server/domain/value-objects/StudentRA';
import type { GuestExitRequestDTO, RequestExitResponseDTO } from '@shared/dtos';
import { MovementAuthorizationError } from './AuthorizeEmergencyExitUseCase';
import {
  InactiveStudentError,
  MovementValidationError,
  RequestStudentExitUseCase,
} from './RequestStudentExitUseCase';

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
    options: { clock?: () => Date } = {},
  ) {
    this.studentRepo = studentRepo;
    this.requestExitUseCase = new RequestStudentExitUseCase(
      sessionRepo,
      studentRepo,
      movementRepo,
      notificationSender,
      options,
    );
  }

  public async execute(
    input: AuthorizeGuestExitInput,
  ): Promise<RequestExitResponseDTO> {
    const teacherId = (input.authorizedByTeacherId ?? '').trim();
    if (!teacherId) {
      throw new MovementAuthorizationError(
        'A autorização de aluno avulso exige permissão e identificação do professor responsável.',
      );
    }

    let raObj: StudentRA;
    try {
      const candidateRa =
        input.ra ??
        (input as unknown as { studentRa?: string }).studentRa ??
        '';
      raObj = StudentRA.create(candidateRa);
    } catch (err) {
      throw new MovementValidationError(
        err instanceof Error ? err.message : 'RA inválido.',
      );
    }

    let student = await this.studentRepo.findByRa(raObj.value);
    if (student && !student.isActive) {
      throw new InactiveStudentError(
        `O aluno ${student.publicName} (RA ${student.ra}) está inativo e não pode receber Autorização Avulsa no Terminal de Sala.`,
      );
    }

    if (!student) {
      const guestName =
        (input.fullName ?? '').trim() || `Aluno Visitante ${raObj.value}`;
      const originClass = (input.originClassCode ?? '').trim() || 'AVULSO';
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
