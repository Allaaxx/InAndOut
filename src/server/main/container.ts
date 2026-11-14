import { IUserRepository } from '@server/domain/repositories/IUserRepository';
import { ITokenService } from '@server/application/contracts/ITokenService';
import { INotificationSender } from '@server/application/contracts/INotificationSender';
import { InMemoryUserRepository } from '@server/infrastructure/repositories/InMemoryUserRepository';
import { JwtTokenService } from '@server/infrastructure/services/JwtTokenService';
import { SocketNotificationSender } from '@server/infrastructure/services/SocketNotificationSender';

export interface AppContainer {
  clock: () => Date;
  userRepo: IUserRepository;
  tokenService: ITokenService;
  notificationSender: INotificationSender;
}

export function createContainer(
  overrides: Partial<AppContainer> = {}
): AppContainer {
  const clock = overrides.clock ?? (() => new Date());
  const userRepo = overrides.userRepo ?? new InMemoryUserRepository();
  const tokenService =
    overrides.tokenService ?? new JwtTokenService({ clock });
  const notificationSender =
    overrides.notificationSender ?? new SocketNotificationSender();

  return {
    clock,
    userRepo,
    tokenService,
    notificationSender,
  };
}
