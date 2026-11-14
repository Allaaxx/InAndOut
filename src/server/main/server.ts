import { createApp } from './app';

async function bootstrap() {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';

  const { app } = await createApp();

  try {
    const address = await app.listen({ port, host });
    console.log(`InAndOut Server running at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
