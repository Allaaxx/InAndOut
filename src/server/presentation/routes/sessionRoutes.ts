import { FastifyInstance } from 'fastify';
import { AppContainer } from '@server/main/container';
import {
  SessionConflictError,
  SessionValidationError,
  StartClassSessionUseCase,
} from '@server/application/use-cases/sessions/StartClassSessionUseCase';
import { GetActiveSessionUseCase } from '@server/application/use-cases/sessions/GetActiveSessionUseCase';
import {
  EndClassSessionUseCase,
  SessionNotFoundError,
} from '@server/application/use-cases/sessions/EndClassSessionUseCase';
import { extractBearerToken } from '@server/presentation/middlewares/authMiddleware';
import {
  EndSessionRequestDTO,
  StartSessionRequestDTO,
} from '@shared/dtos';

export async function registerSessionRoutes(
  app: FastifyInstance,
  container: AppContainer
): Promise<void> {
  const startSessionUseCase = new StartClassSessionUseCase(
    container.sessionRepo,
    { clock: container.clock }
  );
  const getActiveSessionUseCase = new GetActiveSessionUseCase(
    container.sessionRepo,
    {
      movementRepo: container.movementRepo,
      queueRepo: container.queueRepo,
      clock: container.clock,
    }
  );
  const endSessionUseCase = new EndClassSessionUseCase(container.sessionRepo, {
    clock: container.clock,
    movementRepo: container.movementRepo,
  });

  app.post<{ Body: StartSessionRequestDTO }>(
    '/sessions/start',
    async (request, reply) => {
      try {
        let teacherId = request.body?.teacherId ?? 'teacher-1';
        let teacherName = request.body?.teacherName ?? 'Prof. Carlos Eduardo';

        const token = extractBearerToken(request);
        if (token) {
          try {
            const payload = container.tokenService.verifyAccessToken(token);
            teacherId = payload.sub;
            teacherName = payload.name;
          } catch (err) {
            return reply.status(401).send({
              error:
                err instanceof Error
                  ? err.message
                  : 'Token inválido ou expirado.',
            });
          }
        }

        const result = await startSessionUseCase.execute({
          ...(request.body ?? ({} as StartSessionRequestDTO)),
          teacherId,
          teacherName,
        });

        return reply.status(201).send(result);
      } catch (err) {
        if (err instanceof SessionValidationError) {
          return reply.status(400).send({ error: err.message });
        }
        if (err instanceof SessionConflictError) {
          return reply.status(409).send({ error: err.message });
        }
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao iniciar sessão de aula.',
        });
      }
    }
  );

  app.get<{ Querystring: { roomId?: string } }>(
    '/sessions/active',
    async (request, reply) => {
      try {
        const result = await getActiveSessionUseCase.execute({
          roomId: request.query?.roomId,
        });
        return reply.status(200).send(result);
      } catch (err) {
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao consultar sessão ativa.',
        });
      }
    }
  );

  app.post<{ Body: EndSessionRequestDTO }>(
    '/sessions/end',
    async (request, reply) => {
      try {
        const token = extractBearerToken(request);
        if (token) {
          try {
            container.tokenService.verifyAccessToken(token);
          } catch (err) {
            return reply.status(401).send({
              error:
                err instanceof Error
                  ? err.message
                  : 'Token inválido ou expirado.',
            });
          }
        }

        const result = await endSessionUseCase.execute(request.body ?? {});
        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof SessionNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao encerrar sessão de aula.',
        });
      }
    }
  );
}
