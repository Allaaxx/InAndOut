import type { ITokenService } from '@server/application/contracts/ITokenService';
import type { IUserRepository } from '@server/domain/repositories/IUserRepository';
import type {
  RefreshTokenRequestDTO,
  RefreshTokenResponseDTO,
} from '@shared/dtos';
import { AuthenticationError } from './LoginUseCase';

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenService: ITokenService,
  ) {}

  public async execute(
    input: RefreshTokenRequestDTO,
  ): Promise<RefreshTokenResponseDTO> {
    if (!input.refreshToken) {
      throw new AuthenticationError('Refresh token não fornecido.');
    }

    let payload: ReturnType<ITokenService['verifyRefreshToken']>;
    try {
      payload = this.tokenService.verifyRefreshToken(input.refreshToken);
    } catch (err) {
      throw new AuthenticationError(
        err instanceof Error
          ? err.message
          : 'Refresh token inválido ou expirado.',
      );
    }

    const user = await this.userRepo.findById(payload.sub);
    if (!user) {
      throw new AuthenticationError('Usuário não encontrado.');
    }

    const nextPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      pinVerified: payload.pinVerified ?? true,
    };

    const token = this.tokenService.signAccessToken(nextPayload);
    const refreshToken = this.tokenService.signRefreshToken(nextPayload);

    return {
      token,
      refreshToken,
    };
  }
}
