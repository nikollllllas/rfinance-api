import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Request, type Response } from 'express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

const expressServer = express();
let isInitialized = false;

async function bootstrap() {
  if (isInitialized) return expressServer;

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressServer),
    { logger: ['error', 'warn'] },
  );
  configureApp(app);

  await app.init();
  isInitialized = true;
  return expressServer;
}

export default async (req: Request, res: Response) => {
  const server = await bootstrap();
  server(req, res);
};
