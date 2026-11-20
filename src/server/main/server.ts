import { disconnectPrisma } from '@server/infrastructure/database/prismaClient';
import { APP_TIMEZONE } from '@shared/timezone';
import { createApp } from './app';

process.env.TZ = process.env.TZ || APP_TIMEZONE;

async function bootstrap() {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';

  const { app } = await createApp();

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      await app.close();
      await disconnectPrisma();
      process.exit(0);
    });
  }

  try {
    const address = await app.listen({ port, host });
    console.log(`InAndOut Server running at ${address} (Fastify + Socket.io)`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
