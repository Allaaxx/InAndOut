import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { AppContainer, createContainer } from './container';
import { setupFastifyErrorHandler } from '@server/presentation/errors/errorHandler';
import { EvaluateOverdueMovementsUseCase } from '@server/application/use-cases/movements/EvaluateOverdueMovementsUseCase';
import { registerAuthRoutes } from '@server/presentation/routes/authRoutes';
import { registerSessionRoutes } from '@server/presentation/routes/sessionRoutes';
import { registerMovementRoutes } from '@server/presentation/routes/movementRoutes';
import { registerMovementQueueRoutes } from '@server/presentation/routes/movementQueueRoutes';
import { registerMovementOverrideRoutes } from '@server/presentation/routes/movementOverrideRoutes';
import { registerMovementEscalationRoutes } from '@server/presentation/routes/movementEscalationRoutes';
import { registerCoordinationRoutes } from '@server/presentation/routes/coordinationRoutes';
import { registerAnalyticsRoutes } from '@server/presentation/routes/analyticsRoutes';

export interface CreateAppOptions {
  enableBackgroundTimer?: boolean;
  autoEvaluateIntervalMs?: number;
}

export interface CreateAppResult {
  app: FastifyInstance;
  container: AppContainer;
  stopBackgroundTimer: () => void;
}

export async function createApp(
  overrides: Partial<AppContainer> = {},
  options: CreateAppOptions = {}
): Promise<CreateAppResult> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  const container = createContainer(overrides);
  setupFastifyErrorHandler(app);

  await registerAuthRoutes(app, container);
  await registerSessionRoutes(app, container);
  await registerMovementRoutes(app, container);
  await registerMovementQueueRoutes(app, container);
  await registerMovementOverrideRoutes(app, container);
  await registerMovementEscalationRoutes(app, container);
  await registerCoordinationRoutes(app, container);
  await registerAnalyticsRoutes(app, container);

  let timer: NodeJS.Timeout | null = null;
  const stopBackgroundTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  if (options.enableBackgroundTimer ?? true) {
    const evaluateOverdueUseCase = new EvaluateOverdueMovementsUseCase(
      container.movementRepo,
      container.notificationSender,
      {
        sessionRepo: container.sessionRepo,
        clock: container.clock,
      }
    );

    const intervalMs = options.autoEvaluateIntervalMs ?? 30_000;
    timer = setInterval(async () => {
      try {
        await evaluateOverdueUseCase.execute({});
      } catch {
        // Suppress background errors
      }
    }, intervalMs);
    timer.unref();
  }

  app.addHook('onClose', async () => {
    stopBackgroundTimer();
  });

  return { app, container, stopBackgroundTimer };
}
