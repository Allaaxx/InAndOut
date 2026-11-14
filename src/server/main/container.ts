import { IUserRepository } from '@server/domain/repositories/IUserRepository';
import { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import { ITokenService } from '@server/application/contracts/ITokenService';
import { INotificationSender } from '@server/application/contracts/INotificationSender';
import { InMemoryUserRepository } from '@server/infrastructure/repositories/InMemoryUserRepository';
import { InMemoryClassSessionRepository } from '@server/infrastructure/repositories/InMemoryClassSessionRepository';
import { InMemoryStudentRepository } from '@server/infrastructure/repositories/InMemoryStudentRepository';
import { InMemoryMovementRecordRepository } from '@server/infrastructure/repositories/InMemoryMovementRecordRepository';
import { JwtTokenService } from '@server/infrastructure/services/JwtTokenService';
import { SocketNotificationSender } from '@server/infrastructure/services/SocketNotificationSender';

export interface AppContainer {
  clock: () => Date;
  userRepo: IUserRepository;
  sessionRepo: IClassSessionRepository;
  studentRepo: IStudentRepository;
  movementRepo: IMovementRecordRepository;
  tokenService: ITokenService;
  notificationSender: INotificationSender;
}

export function createContainer(
  overrides: Partial<AppContainer> = {}
): AppContainer {
  const clock = overrides.clock ?? (() => new Date());
  const userRepo = overrides.userRepo ?? new InMemoryUserRepository();
  const sessionRepo =
    overrides.sessionRepo ?? new InMemoryClassSessionRepository();
  const studentRepo = overrides.studentRepo ?? new InMemoryStudentRepository();
  const movementRepo =
    overrides.movementRepo ?? new InMemoryMovementRecordRepository();
  const tokenService =
    overrides.tokenService ?? new JwtTokenService({ clock });
  const notificationSender =
    overrides.notificationSender ?? new SocketNotificationSender();

  return {
    clock,
    userRepo,
    sessionRepo,
    studentRepo,
    movementRepo,
    tokenService,
    notificationSender,
  };
}
