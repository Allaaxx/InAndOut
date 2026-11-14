import { FastifyInstance } from 'fastify';
import { AppContainer } from '@server/main/container';
import { GetSchoolOverviewAnalyticsUseCase } from '@server/application/use-cases/analytics/GetSchoolOverviewAnalyticsUseCase';
import { createAuthMiddleware } from '@server/presentation/middlewares/authMiddleware';
import { UserRole } from '@shared/enums';
import { SchoolOverviewQueryDTO } from '@shared/dtos';

export async function registerAnalyticsRoutes(
  app: FastifyInstance,
  container: AppContainer
): Promise<void> {
  const auth = createAuthMiddleware(container.tokenService);
  const getSchoolOverviewAnalyticsUseCase =
    new GetSchoolOverviewAnalyticsUseCase(container.movementRepo, {
      clock: container.clock,
    });

  app.get<{
    Querystring: SchoolOverviewQueryDTO;
  }>(
    '/analytics/overview',
    {
      preHandler: auth.requireRoles([
        UserRole.TEACHER,
        UserRole.COORDINATOR,
        UserRole.ADMIN,
      ]),
    },
    async (request, reply) => {
      try {
        const query = request.query ?? {};
        const result = await getSchoolOverviewAnalyticsUseCase.execute(query);
        return reply.status(200).send(result);
      } catch (err) {
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao consultar métricas e indicadores escolares.',
        });
      }
    }
  );
}
