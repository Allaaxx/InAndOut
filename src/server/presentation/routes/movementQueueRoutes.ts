import { CancelQueueEntryUseCase } from '@server/application/use-cases/movements/CancelQueueEntryUseCase';
import { ClaimQueueSlotUseCase } from '@server/application/use-cases/movements/ClaimQueueSlotUseCase';
import {
  EnqueueStudentUseCase,
  QueueConflictError,
  QueueWindowExpiredError,
} from '@server/application/use-cases/movements/EnqueueStudentUseCase';
import {
  InactiveStudentError,
  MovementNotFoundError,
  MovementValidationError,
  StudentNotInClassError,
} from '@server/application/use-cases/movements/RequestStudentExitUseCase';
import type { AppContainer } from '@server/main/container';
import type {
  ClaimQueueRequestDTO,
  EnqueueWaitingRequestDTO,
} from '@shared/dtos';
import type { FastifyInstance } from 'fastify';

export async function registerMovementQueueRoutes(
  app: FastifyInstance,
  container: AppContainer,
): Promise<void> {
  const enqueueUseCase = new EnqueueStudentUseCase(
    container.sessionRepo,
    container.studentRepo,
    container.movementRepo,
    container.queueRepo,
    container.notificationSender,
    { clock: container.clock },
  );

  const cancelUseCase = new CancelQueueEntryUseCase(
    container.sessionRepo,
    container.movementRepo,
    container.queueRepo,
    container.notificationSender,
    { clock: container.clock },
  );

  const claimUseCase = new ClaimQueueSlotUseCase(
    container.sessionRepo,
    container.studentRepo,
    container.movementRepo,
    container.queueRepo,
    container.notificationSender,
    { clock: container.clock },
  );

  app.post<{ Body: EnqueueWaitingRequestDTO }>(
    '/movements/queue',
    async (request, reply) => {
      try {
        const result = await enqueueUseCase.execute(
          request.body ?? ({} as EnqueueWaitingRequestDTO),
        );
        return reply.status(201).send(result);
      } catch (err) {
        if (err instanceof MovementValidationError) {
          return reply.status(400).send({ error: err.message });
        }
        if (err instanceof MovementNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        if (
          err instanceof StudentNotInClassError ||
          err instanceof InactiveStudentError
        ) {
          return reply.status(403).send({ error: err.message });
        }
        if (err instanceof QueueConflictError) {
          return reply.status(409).send({ error: err.message });
        }
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao entrar na fila de espera.',
        });
      }
    },
  );

  app.delete<{
    Params: { ra: string };
    Querystring: { sessionId?: string; roomId?: string };
  }>('/movements/queue/:ra', async (request, reply) => {
    try {
      const { ra } = request.params;
      const { sessionId, roomId } = request.query;
      const result = await cancelUseCase.execute({
        ra,
        sessionId,
        roomId,
      });
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
            : 'Erro interno ao cancelar solicitação na fila.',
      });
    }
  });

  app.post<{ Body: ClaimQueueRequestDTO }>(
    '/movements/queue/claim',
    async (request, reply) => {
      try {
        const result = await claimUseCase.execute(
          request.body ?? ({} as ClaimQueueRequestDTO),
        );
        return reply.status(201).send(result);
      } catch (err) {
        if (err instanceof MovementValidationError) {
          return reply.status(400).send({ error: err.message });
        }
        if (err instanceof MovementNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        if (err instanceof InactiveStudentError) {
          return reply.status(403).send({ error: err.message });
        }
        if (
          err instanceof QueueConflictError ||
          err instanceof QueueWindowExpiredError
        ) {
          return reply.status(409).send({ error: err.message });
        }
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao confirmar saída da fila.',
        });
      }
    },
  );
}
