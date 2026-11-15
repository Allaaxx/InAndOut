import { IUserRepository } from '@server/domain/repositories/IUserRepository';
import { ITokenService } from '@server/application/contracts/ITokenService';
import { verifyPassword } from '@server/infrastructure/repositories/InMemoryUserRepository';
import { LoginRequestDTO, LoginResponseDTO } from '@shared/dtos';

export class AuthenticationError extends Error {
  public readonly statusCode = 401;
  constructor(message = 'Credenciais inválidas.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  public readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenService: ITokenService
  ) {}

  public async execute(input: LoginRequestDTO): Promise<LoginResponseDTO> {
    if (!input.email || !input.password) {
      throw new AuthenticationError('E-mail e senha são obrigatórios.');
    }

    const user = await this.userRepo.findByEmail(input.email);
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new AuthenticationError('E-mail ou senha inválidos.');
    }

    if (input.pin !== undefined && input.pin !== '') {
      try {
        user.updatePin(input.pin);
        await this.userRepo.save(user);
      } catch (err) {
        throw new ValidationError(
          err instanceof Error ? err.message : 'PIN inválido.'
        );
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      pinVerified: true,
    };

    const token = this.tokenService.signAccessToken(payload);
    const refreshToken = this.tokenService.signRefreshToken(payload);

    return {
      token,
      refreshToken,
      user: user.toDTO(),
    };
  }
}
