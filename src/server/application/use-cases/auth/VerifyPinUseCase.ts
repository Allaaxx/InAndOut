import { IUserRepository } from '@server/domain/repositories/IUserRepository';
import { ITokenService } from '@server/application/contracts/ITokenService';
import { AuthenticationError } from './LoginUseCase';
import { VerifyPinResponseDTO } from '@shared/dtos';

export interface VerifyPinInput {
  userId: string;
  pin: string;
}

export class VerifyPinUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenService: ITokenService
  ) {}

  public async execute(input: VerifyPinInput): Promise<VerifyPinResponseDTO> {
    if (!input.pin || !/^\d{4}$/.test(input.pin.trim())) {
      throw new AuthenticationError('PIN inválido. Digite os 4 dígitos numéricos.');
    }

    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new AuthenticationError('Usuário não encontrado.');
    }

    if (!user.verifyPin(input.pin)) {
      throw new AuthenticationError('PIN incorreto.');
    }

    const unlockedToken = this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      pinVerified: true,
    });

    return {
      valid: true,
      unlockedToken,
      user: user.toDTO(),
    };
  }
}
