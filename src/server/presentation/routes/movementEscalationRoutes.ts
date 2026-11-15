import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppContainer } from '@server/main/container';
import { EscalateMovementUseCase } from '@server/application/use-cases/movements/EscalateMovementUseCase';
import { EvaluateOverdueMovementsUseCase } from '@server/application/use-cases/movements/EvaluateOverdueMovementsUseCase';
import {
  MovementNotFoundError,
  MovementValidationError,
} from '@server/application/use-cases/movements/RequestStudentExitUseCase';
import { extractBearerToken } from '@server/presentation/middlewares/authMiddleware';
import {
  CheckOverdueRequestDTO,
  EscalateMovementRequestDTO,
} from '@shared/dtos';

export async function registerMovementEscalationRoutes(
  app: FastifyInstance,
  container: AppContainer
): Promise<void> {
  const escalateMovementUseCase = new EscalateMovementUseCase(
    container.movementRepo,
    container.notificationSender,
    { clock: container.clock }
  );

  const evaluateOverdueUseCase = new EvaluateOverdueMovementsUseCase(
    container.movementRepo,
    container.notificationSender,
    {
      sessionRepo: container.sessionRepo,
      clock: container.clock,
    }
  );

  app.post<{
    Params: { id: string };
    Body: EscalateMovementRequestDTO;
  }>('/movements/:id/escalate', async (request, reply) => {
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

      const result = await escalateMovementUseCase.execute({
        movementId: request.params.id,
        notes: request.body?.notes,
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
            : 'Erro interno ao escalar saída para a Coordenação.',
      });
    }
  });

  const handleEvaluateOverdue = async (
    request: FastifyRequest<{ Body: CheckOverdueRequestDTO }>,
    reply: FastifyReply
  ) => {
    try {
      const result = await evaluateOverdueUseCase.execute(request.body ?? {});
      return reply.status(200).send(result);
    } catch (err) {
      return reply.status(500).send({
        error:
          err instanceof Error
            ? err.message
            : 'Erro interno ao verificar saídas em atraso.',
      });
    }
  };

  app.post<{ Body: CheckOverdueRequestDTO }>(
    '/movements/check-overdue',
    handleEvaluateOverdue
  );

  app.post<{ Body: CheckOverdueRequestDTO }>(
    '/movements/evaluate-overdue',
    handleEvaluateOverdue
  );
}
