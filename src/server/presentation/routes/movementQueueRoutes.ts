import { FastifyInstance } from 'fastify';
import { AppContainer } from '@server/main/container';

export async function registerMovementQueueRoutes(
  _app: FastifyInstance,
  _container: AppContainer
): Promise<void> {
  // Extension point for Ticket #6 (FIFO Waiting Queue + 2-minute confirmation window)
}
