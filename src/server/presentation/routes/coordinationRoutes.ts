import { FastifyInstance } from 'fastify';
import { AppContainer } from '@server/main/container';
import { GetActiveMovementsOverviewUseCase } from '@server/application/use-cases/coordination/GetActiveMovementsOverviewUseCase';
import { createAuthMiddleware } from '@server/presentation/middlewares/authMiddleware';
import { MovementStatus, UserRole } from '@shared/enums';

export interface ActiveMovementsQuery {
  classCode?: string;
  status?: MovementStatus;
}

export async function registerCoordinationRoutes(
  app: FastifyInstance,
  container: AppContainer
): Promise<void> {
  const auth = createAuthMiddleware(container.tokenService);
  const getActiveMovementsOverviewUseCase =
    new GetActiveMovementsOverviewUseCase(container.movementRepo, {
      clock: container.clock,
    });

  app.get<{
    Querystring: ActiveMovementsQuery;
  }>(
    '/coordination/active-movements',
    {
      preHandler: auth.requireRoles([
        UserRole.COORDINATOR,
        UserRole.ADMIN,
      ]),
    },
    async (request, reply) => {
      try {
        const { classCode, status } = request.query;

        const result = await getActiveMovementsOverviewUseCase.execute({
          classCode,
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
    }
  );
}
