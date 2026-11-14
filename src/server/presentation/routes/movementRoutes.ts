import { FastifyInstance } from 'fastify';
import { AppContainer } from '@server/main/container';
import {
  MovementConcurrencyConflictError,
  MovementNotFoundError,
  MovementValidationError,
  RequestStudentExitUseCase,
  StudentNotInClassError,
} from '@server/application/use-cases/movements/RequestStudentExitUseCase';
import { RequestExitRequestDTO } from '@shared/dtos';

export async function registerMovementRoutes(
  app: FastifyInstance,
  container: AppContainer
): Promise<void> {
  const requestExitUseCase = new RequestStudentExitUseCase(
    container.sessionRepo,
    container.studentRepo,
    container.movementRepo,
    container.notificationSender,
    { clock: container.clock }
  );

  app.post<{ Body: RequestExitRequestDTO }>(
    '/movements/exit',
    async (request, reply) => {
      try {
        const result = await requestExitUseCase.execute(
          request.body ?? ({} as RequestExitRequestDTO)
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
    }
  );
}

export { registerMovementRoutes as registerMovementExitRoutes };
