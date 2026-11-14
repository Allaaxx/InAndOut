import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { AppContainer, createContainer } from './container';
import { registerAuthRoutes } from '@server/presentation/routes/authRoutes';
import { registerSessionRoutes } from '@server/presentation/routes/sessionRoutes';
import { registerMovementRoutes } from '@server/presentation/routes/movementRoutes';

export interface CreateAppResult {
  app: FastifyInstance;
  container: AppContainer;
}

export async function createApp(
  overrides: Partial<AppContainer> = {}
): Promise<CreateAppResult> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  const container = createContainer(overrides);

  await registerAuthRoutes(app, container);
  await registerSessionRoutes(app, container);
  await registerMovementRoutes(app, container);

  return { app, container };
}
