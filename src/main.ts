import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { env } from './env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(env.PORT, '0.0.0.0');
}

bootstrap().catch((err: unknown) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
