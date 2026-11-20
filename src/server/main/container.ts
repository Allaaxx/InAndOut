import type { INotificationSender } from '@server/application/contracts/INotificationSender';
import type { ITokenService } from '@server/application/contracts/ITokenService';
import type { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import type { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import type { IRoomRepository } from '@server/domain/repositories/IRoomRepository';
import type { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import type { IUserRepository } from '@server/domain/repositories/IUserRepository';
import type { IWaitingQueueRepository } from '@server/domain/repositories/IWaitingQueueRepository';
import { InMemoryClassSessionRepository } from '@server/infrastructure/repositories/InMemoryClassSessionRepository';
import { InMemoryMovementRecordRepository } from '@server/infrastructure/repositories/InMemoryMovementRecordRepository';
import { InMemoryRoomRepository } from '@server/infrastructure/repositories/InMemoryRoomRepository';
import { InMemoryStudentRepository } from '@server/infrastructure/repositories/InMemoryStudentRepository';
import { InMemoryUserRepository } from '@server/infrastructure/repositories/InMemoryUserRepository';
import { InMemoryWaitingQueueRepository } from '@server/infrastructure/repositories/InMemoryWaitingQueueRepository';
import {
  PrismaClassSessionRepository,
  PrismaMovementRecordRepository,
  PrismaRoomRepository,
  PrismaStudentRepository,
  PrismaUserRepository,
  PrismaWaitingQueueRepository,
} from '@server/infrastructure/repositories/prisma';
import { JwtTokenService } from '@server/infrastructure/services/JwtTokenService';
import { SocketNotificationSender } from '@server/infrastructure/services/SocketNotificationSender';

export interface AppContainer {
  clock: () => Date;
  userRepo: IUserRepository;
  roomRepo: IRoomRepository;
  sessionRepo: IClassSessionRepository;
  studentRepo: IStudentRepository;
  movementRepo: IMovementRecordRepository;
  queueRepo: IWaitingQueueRepository;
  tokenService: ITokenService;
  notificationSender: INotificationSender;
}

export function createContainer(
  overrides: Partial<AppContainer> = {},
): AppContainer {
  const clock = overrides.clock ?? (() => new Date());
  const useDatabase = Boolean(
    process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '',
  );

  const userRepo =
    overrides.userRepo ??
    (useDatabase ? new PrismaUserRepository() : new InMemoryUserRepository());

  const roomRepo =
    overrides.roomRepo ??
    (useDatabase ? new PrismaRoomRepository() : new InMemoryRoomRepository());

  const sessionRepo =
    overrides.sessionRepo ??
    (useDatabase
      ? new PrismaClassSessionRepository()
      : new InMemoryClassSessionRepository());

  const studentRepo =
    overrides.studentRepo ??
    (useDatabase
      ? new PrismaStudentRepository()
      : new InMemoryStudentRepository());

  const movementRepo =
    overrides.movementRepo ??
    (useDatabase
      ? new PrismaMovementRecordRepository()
      : new InMemoryMovementRecordRepository());

  const queueRepo =
    overrides.queueRepo ??
    (useDatabase
      ? new PrismaWaitingQueueRepository()
      : new InMemoryWaitingQueueRepository());

  const tokenService = overrides.tokenService ?? new JwtTokenService({ clock });
  const notificationSender =
    overrides.notificationSender ?? new SocketNotificationSender();

  return {
    clock,
    userRepo,
    roomRepo,
    sessionRepo,
    studentRepo,
    movementRepo,
    queueRepo,
    tokenService,
    notificationSender,
  };
}
