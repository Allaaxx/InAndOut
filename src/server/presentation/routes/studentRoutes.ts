import { CreateStudentUseCase } from '@server/application/use-cases/students/CreateStudentUseCase';
import { ListStudentsUseCase } from '@server/application/use-cases/students/ListStudentsUseCase';
import { UpdateStudentStatusUseCase } from '@server/application/use-cases/students/UpdateStudentStatusUseCase';
import { UpdateStudentUseCase } from '@server/application/use-cases/students/UpdateStudentUseCase';
import type { AppContainer } from '@server/main/container';
import { createAuthMiddleware } from '@server/presentation/middlewares/authMiddleware';
import type {
  CreateStudentRequestDTO,
  UpdateStudentRequestDTO,
  UpdateStudentStatusRequestDTO,
} from '@shared/dtos';
import { UserRole } from '@shared/enums';
import type { FastifyInstance } from 'fastify';

export interface ListStudentsQuery {
  search?: string;
  classGroupId?: string;
  classCode?: string;
  isActive?: string;
  onlyActive?: string;
}

export async function registerStudentRoutes(
  app: FastifyInstance,
  container: AppContainer,
): Promise<void> {
  const auth = createAuthMiddleware(container.tokenService);
  const listStudentsUseCase = new ListStudentsUseCase(container.studentRepo);
  const createStudentUseCase = new CreateStudentUseCase(
    container.studentRepo,
    container.classGroupRepo,
    { clock: container.clock },
  );
  const updateStudentUseCase = new UpdateStudentUseCase(
    container.studentRepo,
    container.classGroupRepo,
    { clock: container.clock },
  );
  const updateStudentStatusUseCase = new UpdateStudentStatusUseCase(
    container.studentRepo,
    { clock: container.clock },
  );

  app.get<{ Querystring: ListStudentsQuery }>(
    '/students',
    {
      preHandler: auth.requireRoles([UserRole.COORDINATOR, UserRole.ADMIN]),
    },
    async (request, reply) => {
      let isActive: boolean | undefined;
      if (request.query?.onlyActive === 'true') {
        isActive = true;
      } else if (request.query?.isActive === 'true') {
        isActive = true;
      } else if (request.query?.isActive === 'false') {
        isActive = false;
      }

      const result = await listStudentsUseCase.execute({
        search: request.query?.search,
        classGroupId: request.query?.classGroupId,
        classCode: request.query?.classCode,
        isActive,
      });

      return reply.status(200).send(result);
    },
  );

  app.post<{ Body: CreateStudentRequestDTO }>(
    '/students',
    {
      preHandler: auth.requireRoles([UserRole.COORDINATOR, UserRole.ADMIN]),
    },
    async (request, reply) => {
      const result = await createStudentUseCase.execute(request.body);
      return reply.status(201).send(result);
    },
  );

  app.patch<{
    Params: { id: string };
    Body: UpdateStudentRequestDTO;
  }>(
    '/students/:id',
    {
      preHandler: auth.requireRoles([UserRole.COORDINATOR, UserRole.ADMIN]),
    },
    async (request, reply) => {
      const result = await updateStudentUseCase.execute({
        studentId: request.params.id,
        ra: request.body?.ra,
        fullName: request.body?.fullName,
        classGroupId: request.body?.classGroupId,
        classCode: request.body?.classCode,
        hasSpecialCondition: request.body?.hasSpecialCondition,
        specialLimitMinutes: request.body?.specialLimitMinutes,
        specialTimeLimitMinutes: request.body?.specialTimeLimitMinutes,
      });
      return reply.status(200).send(result);
    },
  );

  app.patch<{
    Params: { id: string };
    Body: UpdateStudentStatusRequestDTO;
  }>(
    '/students/:id/status',
    {
      preHandler: auth.requireRoles([UserRole.COORDINATOR, UserRole.ADMIN]),
    },
    async (request, reply) => {
      const result = await updateStudentStatusUseCase.execute({
        studentId: request.params.id,
        isActive: request.body?.isActive,
      });
      return reply.status(200).send(result);
    },
  );
}
