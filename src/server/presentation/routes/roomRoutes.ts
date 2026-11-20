import { CreateRoomUseCase } from '@server/application/use-cases/rooms/CreateRoomUseCase';
import { ListRoomsUseCase } from '@server/application/use-cases/rooms/ListRoomsUseCase';
import { UpdateRoomStatusUseCase } from '@server/application/use-cases/rooms/UpdateRoomStatusUseCase';
import type { AppContainer } from '@server/main/container';
import { createAuthMiddleware } from '@server/presentation/middlewares/authMiddleware';
import type {
  CreateRoomRequestDTO,
  UpdateRoomStatusRequestDTO,
} from '@shared/dtos';
import { UserRole } from '@shared/enums';
import type { FastifyInstance } from 'fastify';

export interface ListRoomsQuery {
  onlyActive?: string;
}

export async function registerRoomRoutes(
  app: FastifyInstance,
  container: AppContainer,
): Promise<void> {
  const auth = createAuthMiddleware(container.tokenService);
  const listRoomsUseCase = new ListRoomsUseCase(container.roomRepo);
  const createRoomUseCase = new CreateRoomUseCase(container.roomRepo, {
    clock: container.clock,
  });
  const updateRoomStatusUseCase = new UpdateRoomStatusUseCase(
    container.roomRepo,
    {
      clock: container.clock,
    },
  );

  app.get<{ Querystring: ListRoomsQuery }>(
    '/rooms',
    {
      preHandler: auth.requireAuth,
    },
    async (request, reply) => {
      const onlyActive = request.query?.onlyActive === 'true';
      const result = await listRoomsUseCase.execute({ onlyActive });
      return reply.status(200).send(result);
    },
  );

  app.post<{ Body: CreateRoomRequestDTO }>(
    '/rooms',
    {
      preHandler: auth.requireRoles([UserRole.COORDINATOR, UserRole.ADMIN]),
    },
    async (request, reply) => {
      const result = await createRoomUseCase.execute(request.body);
      return reply.status(201).send(result);
    },
  );

  app.patch<{
    Params: { id: string };
    Body: UpdateRoomStatusRequestDTO;
  }>(
    '/rooms/:id/status',
    {
      preHandler: auth.requireRoles([UserRole.COORDINATOR, UserRole.ADMIN]),
    },
    async (request, reply) => {
      const result = await updateRoomStatusUseCase.execute({
        roomId: request.params.id,
        isActive: request.body?.isActive,
      });
      return reply.status(200).send(result);
    },
  );
}
