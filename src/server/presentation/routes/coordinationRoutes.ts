import { GetActiveMovementsOverviewUseCase } from '@server/application/use-cases/coordination/GetActiveMovementsOverviewUseCase';
import {
  InvalidOutcomeError,
  MovementNotFoundError,
  ResolveMovementIncidentUseCase,
} from '@server/application/use-cases/coordination/ResolveMovementIncidentUseCase';
import type { AppContainer } from '@server/main/container';
import { createAuthMiddleware } from '@server/presentation/middlewares/authMiddleware';
import type { ResolveMovementRequestDTO } from '@shared/dtos';
import { type MovementStatus, UserRole } from '@shared/enums';
import type { FastifyInstance } from 'fastify';

export interface ActiveMovementsQuery {
  classCode?: string;
  roomId?: string;
  status?: MovementStatus;
}

export async function registerCoordinationRoutes(
  app: FastifyInstance,
  container: AppContainer,
): Promise<void> {
  const auth = createAuthMiddleware(container.tokenService);
  const getActiveMovementsOverviewUseCase =
    new GetActiveMovementsOverviewUseCase(container.movementRepo, {
      clock: container.clock,
      sessionRepo: container.sessionRepo,
      roomRepo: container.roomRepo,
    });
  const resolveMovementUseCase = new ResolveMovementIncidentUseCase(
    container.movementRepo,
    {
      notificationSender: container.notificationSender,
      clock: container.clock,
    },
  );

  app.get<{
    Querystring: ActiveMovementsQuery;
  }>(
    '/coordination/active-movements',
    {
      preHandler: auth.requireRoles([UserRole.COORDINATOR, UserRole.ADMIN]),
    },
    async (request, reply) => {
      try {
        const { classCode, roomId, status } = request.query;

        const result = await getActiveMovementsOverviewUseCase.execute({
          classCode,
          roomId,
          status,
        });

        return reply.status(200).send(result);
      } catch (err) {
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao consultar saídas ativas para a Coordenação.',
        });
      }
    },
  );

  app.post<{
    Params: { id: string };
    Body: ResolveMovementRequestDTO;
  }>(
    '/coordination/movements/:id/resolve',
    {
      preHandler: auth.requireRoles([UserRole.COORDINATOR, UserRole.ADMIN]),
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { outcome, notes, resolutionNotes } = request.body ?? {};

        const coordinatorId = request.authUser?.sub ?? 'coordination';

        const result = await resolveMovementUseCase.execute({
          movementId: id,
          coordinatorId,
          outcome,
          notes: notes ?? resolutionNotes,
        });

        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof InvalidOutcomeError) {
          return reply.status(400).send({ error: err.message });
        }
        if (err instanceof MovementNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao resolver ocorrência de saída.',
        });
      }
    },
  );
}
