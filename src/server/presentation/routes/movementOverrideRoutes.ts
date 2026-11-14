import { FastifyInstance } from 'fastify';
import { AppContainer } from '@server/main/container';

export async function registerMovementOverrideRoutes(
  _app: FastifyInstance,
  _container: AppContainer
): Promise<void> {
  // Extension point for Ticket #7 (Emergency Override & Guest Student Exit)
}
