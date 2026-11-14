import { FastifyInstance } from 'fastify';
import { AppContainer } from '@server/main/container';

export async function registerMovementEscalationRoutes(
  _app: FastifyInstance,
  _container: AppContainer
): Promise<void> {
  // Extension point for Ticket #8 (Time Limit Monitoring, Medical Special Time & 2m Hybrid Escalation)
}
