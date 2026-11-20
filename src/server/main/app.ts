import cors from '@fastify/cors';
import { EvaluateOverdueMovementsUseCase } from '@server/application/use-cases/movements/EvaluateOverdueMovementsUseCase';
import { setupFastifyErrorHandler } from '@server/presentation/errors/errorHandler';
import { registerAnalyticsRoutes } from '@server/presentation/routes/analyticsRoutes';
import { registerAuthRoutes } from '@server/presentation/routes/authRoutes';
import { registerCoordinationRoutes } from '@server/presentation/routes/coordinationRoutes';
import { registerMovementEscalationRoutes } from '@server/presentation/routes/movementEscalationRoutes';
import { registerMovementOverrideRoutes } from '@server/presentation/routes/movementOverrideRoutes';
import { registerMovementQueueRoutes } from '@server/presentation/routes/movementQueueRoutes';
import { registerMovementRoutes } from '@server/presentation/routes/movementRoutes';
import { registerRoomRoutes } from '@server/presentation/routes/roomRoutes';
import { registerSessionRoutes } from '@server/presentation/routes/sessionRoutes';
import { registerSocketHandlers } from '@server/presentation/socket/socketHandlers';
import Fastify, { type FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { type AppContainer, createContainer } from './container';

export interface CreateAppOptions {
  enableBackgroundTimer?: boolean;
  autoEvaluateIntervalMs?: number;
  io?: SocketIOServer;
}

export interface CreateAppResult {
  app: FastifyInstance;
  container: AppContainer;
  stopBackgroundTimer: () => void;
  io: SocketIOServer;
}

export async function createApp(
  overrides: Partial<AppContainer> = {},
  options: CreateAppOptions = {},
): Promise<CreateAppResult> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  const container = createContainer(overrides);
  setupFastifyErrorHandler(app);

  const io =
    options.io ??
    new SocketIOServer(app.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

  if (
    'setServer' in container.notificationSender &&
    typeof (
      container.notificationSender as {
        setServer?: (server: SocketIOServer) => void;
      }
    ).setServer === 'function'
  ) {
    (
      container.notificationSender as {
        setServer: (server: SocketIOServer) => void;
      }
    ).setServer(io);
  }

  registerSocketHandlers(io);

  await registerAuthRoutes(app, container);
  await registerRoomRoutes(app, container);
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
      },
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

  let isIoClosed = false;
  const closeIo = async () => {
    if (!isIoClosed) {
      isIoClosed = true;
      io.disconnectSockets(true);
      await new Promise<void>((resolve) => {
        io.close(() => {
          resolve();
        });
      });
    }
  };

  app.addHook('preClose', async () => {
    await closeIo();
  });

  app.addHook('onClose', async () => {
    stopBackgroundTimer();
    await closeIo();
  });

  return { app, container, stopBackgroundTimer, io };
}
