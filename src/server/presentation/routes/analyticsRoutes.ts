import {
  ExportAnalyticsReportUseCase,
  InvalidExportFormatError,
} from '@server/application/use-cases/analytics/ExportAnalyticsReportUseCase';
import { GetSchoolOverviewAnalyticsUseCase } from '@server/application/use-cases/analytics/GetSchoolOverviewAnalyticsUseCase';
import {
  GetStudentHistoryReportUseCase,
  StudentNotFoundError,
} from '@server/application/use-cases/analytics/GetStudentHistoryReportUseCase';
import type { AppContainer } from '@server/main/container';
import { createAuthMiddleware } from '@server/presentation/middlewares/authMiddleware';
import type {
  ExportAnalyticsQueryDTO,
  SchoolOverviewQueryDTO,
  StudentHistoryQueryDTO,
} from '@shared/dtos';
import { UserRole } from '@shared/enums';
import type { FastifyInstance } from 'fastify';

export async function registerAnalyticsRoutes(
  app: FastifyInstance,
  container: AppContainer,
): Promise<void> {
  const auth = createAuthMiddleware(container.tokenService);
  const getSchoolOverviewAnalyticsUseCase =
    new GetSchoolOverviewAnalyticsUseCase(container.movementRepo, {
      clock: container.clock,
    });
  const getStudentHistoryReportUseCase = new GetStudentHistoryReportUseCase(
    container.studentRepo,
    container.movementRepo,
    { clock: container.clock },
  );
  const exportAnalyticsReportUseCase = new ExportAnalyticsReportUseCase(
    container.movementRepo,
    container.studentRepo,
    { clock: container.clock },
  );

  const allowedRoles = [UserRole.TEACHER, UserRole.COORDINATOR, UserRole.ADMIN];

  app.get<{
    Querystring: SchoolOverviewQueryDTO;
  }>(
    '/analytics/overview',
    {
      preHandler: auth.requireRoles(allowedRoles),
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
    },
  );

  app.get<{
    Params: { ra: string };
    Querystring: StudentHistoryQueryDTO;
  }>(
    '/analytics/students/:ra',
    {
      preHandler: auth.requireRoles(allowedRoles),
    },
    async (request, reply) => {
      try {
        const { ra } = request.params;
        const query = request.query ?? {};
        const result = await getStudentHistoryReportUseCase.execute({
          ra,
          startDate: query.startDate,
          endDate: query.endDate,
        });
        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof StudentNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao consultar histórico do aluno.',
        });
      }
    },
  );

  app.get<{
    Querystring: ExportAnalyticsQueryDTO;
  }>(
    '/analytics/export',
    {
      preHandler: auth.requireRoles(allowedRoles),
    },
    async (request, reply) => {
      try {
        const query = request.query ?? {};
        const result = await exportAnalyticsReportUseCase.execute(query);

        reply.header('Content-Type', result.contentType);
        reply.header(
          'Content-Disposition',
          `attachment; filename="${result.filename}"`,
        );
        return reply.status(200).send(result.content);
      } catch (err) {
        if (err instanceof InvalidExportFormatError) {
          return reply.status(400).send({ error: err.message });
        }
        return reply.status(500).send({
          error:
            err instanceof Error
              ? err.message
              : 'Erro interno ao exportar relatório analítico.',
        });
      }
    },
  );
}
