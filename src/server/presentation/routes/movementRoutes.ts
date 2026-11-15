import { RegisterStudentReturnUseCase } from '@server/application/use-cases/movements/RegisterStudentReturnUseCase';
import {
  MovementConcurrencyConflictError,
  MovementNotFoundError,
  MovementValidationError,
  RequestStudentExitUseCase,
  StudentNotInClassError,
} from '@server/application/use-cases/movements/RequestStudentExitUseCase';
import type { AppContainer } from '@server/main/container';
import type {
  RegisterReturnRequestDTO,
  RequestExitRequestDTO,
} from '@shared/dtos';
import type { FastifyInstance } from 'fastify';

export async function registerMovementRoutes(
  app: FastifyInstance,
  container: AppContainer,
): Promise<void> {
  const requestExitUseCase = new RequestStudentExitUseCase(
    container.sessionRepo,
    container.studentRepo,
    container.movementRepo,
    container.notificationSender,
    { clock: container.clock },
  );

  const registerReturnUseCase = new RegisterStudentReturnUseCase(
    container.sessionRepo,
    container.movementRepo,
    container.notificationSender,
    {
      queueRepo: container.queueRepo,
      clock: container.clock,
    },
  );

  app.post<{ Body: RequestExitRequestDTO }>(
    '/movements/exit',
    async (request, reply) => {
      try {
        const result = await requestExitUseCase.execute(
          request.body ?? ({} as RequestExitRequestDTO),
        );
        return reply.status(201).send(result);
      } catch (err) {
        if (err instanceof MovementValidationError) {
          return reply.status(400).send({ error: err.message });
        }
        if (err instanceof MovementNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        if (err instanceof StudentNotInClassError) {
          return reply.status(403).send({ error: err.message });
        }
        if (err instanceof MovementConcurrencyConflictError) {
          return reply.status(409).send({ error: err.message });
        }
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao registrar saída do aluno.',
        });
      }
    },
  );

  app.post<{ Body: RegisterReturnRequestDTO }>(
    '/movements/return',
    async (request, reply) => {
      try {
        const result = await registerReturnUseCase.execute(
          request.body ?? ({} as RegisterReturnRequestDTO),
        );
        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof MovementValidationError) {
          return reply.status(400).send({ error: err.message });
        }
        if (err instanceof MovementNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao registrar retorno do aluno.',
        });
      }
    },
  );
}
