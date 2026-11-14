import { FastifyInstance } from 'fastify';
import { AppContainer } from '@server/main/container';
import {
  AuthenticationError,
  LoginUseCase,
  ValidationError,
} from '@server/application/use-cases/auth/LoginUseCase';
import { VerifyPinUseCase } from '@server/application/use-cases/auth/VerifyPinUseCase';
import { RefreshTokenUseCase } from '@server/application/use-cases/auth/RefreshTokenUseCase';
import { createAuthMiddleware } from '@server/presentation/middlewares/authMiddleware';
import {
  LoginRequestDTO,
  RefreshTokenRequestDTO,
  VerifyPinRequestDTO,
} from '@shared/dtos';

export async function registerAuthRoutes(
  app: FastifyInstance,
  container: AppContainer
): Promise<void> {
  const loginUseCase = new LoginUseCase(
    container.userRepo,
    container.tokenService
  );
  const verifyPinUseCase = new VerifyPinUseCase(
    container.userRepo,
    container.tokenService
  );
  const refreshTokenUseCase = new RefreshTokenUseCase(
    container.userRepo,
    container.tokenService
  );
  const { requireAuth } = createAuthMiddleware(container.tokenService);

  app.post<{ Body: LoginRequestDTO }>('/auth/login', async (request, reply) => {
    try {
      const result = await loginUseCase.execute(
        request.body ?? ({} as LoginRequestDTO)
      );
      return reply.status(200).send(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        return reply.status(400).send({ error: err.message });
      }
      if (err instanceof AuthenticationError) {
        return reply.status(401).send({ error: err.message });
      }
      return reply.status(500).send({
        error:
          err instanceof Error ? err.message : 'Erro interno de autenticação.',
      });
    }
  });

  app.post<{ Body: VerifyPinRequestDTO }>(
    '/auth/pin/verify',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const authUser = request.authUser;
        if (!authUser) {
          return reply.status(401).send({ error: 'Não autenticado.' });
        }
        const result = await verifyPinUseCase.execute({
          userId: authUser.sub,
          pin: request.body?.pin ?? '',
        });
        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof AuthenticationError) {
          return reply.status(401).send({ error: err.message });
        }
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao verificar PIN.',
        });
      }
    }
  );

  app.post<{ Body: RefreshTokenRequestDTO }>(
    '/auth/refresh',
    async (request, reply) => {
      try {
        const result = await refreshTokenUseCase.execute(
          request.body ?? ({} as RefreshTokenRequestDTO)
        );
        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof AuthenticationError) {
          return reply.status(401).send({ error: err.message });
        }
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao renovar token.',
        });
      }
    }
  );
}
