import {
  ClassGroupValidationError,
  CreateClassGroupUseCase,
} from '@server/application/use-cases/classes/CreateClassGroupUseCase';
import { ListClassGroupsUseCase } from '@server/application/use-cases/classes/ListClassGroupsUseCase';
import { UpdateClassGroupStatusUseCase } from '@server/application/use-cases/classes/UpdateClassGroupStatusUseCase';
import { UpdateClassGroupUseCase } from '@server/application/use-cases/classes/UpdateClassGroupUseCase';
import type { AppContainer } from '@server/main/container';
import { createAuthMiddleware } from '@server/presentation/middlewares/authMiddleware';
import type {
  CreateClassGroupRequestDTO,
  UpdateClassGroupRequestDTO,
  UpdateClassGroupStatusRequestDTO,
} from '@shared/dtos';
import { UserRole } from '@shared/enums';
import type { FastifyInstance } from 'fastify';

export interface ListClassGroupsQuery {
  onlyActive?: string;
  academicYear?: string;
}

export async function registerClassGroupRoutes(
  app: FastifyInstance,
  container: AppContainer,
): Promise<void> {
  const auth = createAuthMiddleware(container.tokenService);
  const listClassGroupsUseCase = new ListClassGroupsUseCase(
    container.classGroupRepo,
  );
  const createClassGroupUseCase = new CreateClassGroupUseCase(
    container.classGroupRepo,
    {
      clock: container.clock,
    },
  );
  const updateClassGroupUseCase = new UpdateClassGroupUseCase(
    container.classGroupRepo,
    {
      clock: container.clock,
    },
  );
  const updateClassGroupStatusUseCase = new UpdateClassGroupStatusUseCase(
    container.classGroupRepo,
    {
      clock: container.clock,
    },
  );

  app.get<{ Querystring: ListClassGroupsQuery }>(
    '/classes',
    {
      preHandler: auth.requireAuth,
    },
    async (request, reply) => {
      const onlyActive = request.query?.onlyActive === 'true';
      let academicYear: number | undefined;

      if (
        request.query?.academicYear !== undefined &&
        request.query.academicYear !== ''
      ) {
        const parsedYear = Number(request.query.academicYear);
        if (!Number.isInteger(parsedYear)) {
          throw new ClassGroupValidationError(
            'O parâmetro academicYear deve ser um número inteiro válido.',
          );
        }
        academicYear = parsedYear;
      }

      const result = await listClassGroupsUseCase.execute({
        onlyActive,
        academicYear,
      });
      return reply.status(200).send(result);
    },
  );

  app.post<{ Body: CreateClassGroupRequestDTO }>(
    '/classes',
    {
      preHandler: auth.requireRoles([UserRole.COORDINATOR, UserRole.ADMIN]),
    },
    async (request, reply) => {
      const result = await createClassGroupUseCase.execute(request.body);
      return reply.status(201).send(result);
    },
  );

  app.patch<{
    Params: { id: string };
    Body: UpdateClassGroupRequestDTO;
  }>(
    '/classes/:id',
    {
      preHandler: auth.requireRoles([UserRole.COORDINATOR, UserRole.ADMIN]),
    },
    async (request, reply) => {
      const result = await updateClassGroupUseCase.execute({
        classGroupId: request.params.id,
        name: request.body?.name,
        academicYear: request.body?.academicYear,
      });
      return reply.status(200).send(result);
    },
  );

  app.patch<{
    Params: { id: string };
    Body: UpdateClassGroupStatusRequestDTO;
  }>(
    '/classes/:id/status',
    {
      preHandler: auth.requireRoles([UserRole.COORDINATOR, UserRole.ADMIN]),
    },
    async (request, reply) => {
      const result = await updateClassGroupStatusUseCase.execute({
        classGroupId: request.params.id,
        isActive: request.body?.isActive,
      });
      return reply.status(200).send(result);
    },
  );
}
