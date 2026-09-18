import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { env } from './env';

// Shared by src/main.ts (local) and src/index.ts (Vercel).
export function configureApp(app: INestApplication): void {
  // Swagger UI needs inline scripts/styles, so CSP is relaxed only for /docs.
  // CORP is cross-origin so the browser frontend can read API responses.
  const strict = helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } });
  const docs = helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  app.use((req, res, next) =>
    (req.path.startsWith('/docs') ? docs : strict)(req, res, next),
  );

  const allowedOrigins = new Set(env.CORS_ALLOWED_ORIGINS);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, server-to-server) without an Origin header.
      callback(null, !origin || allowedOrigins.has(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const config = new DocumentBuilder()
    .setTitle('RFinance API')
    .setDescription('API versionada para gestão financeira')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
}
