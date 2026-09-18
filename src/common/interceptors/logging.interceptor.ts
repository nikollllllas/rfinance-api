import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{ method: string; originalUrl: string }>();
    const response = http.getResponse<{ statusCode: number }>();
    const startedAt = Date.now();
    const line = (status: number) =>
      `${request.method} ${request.originalUrl} ${status} ${Date.now() - startedAt}ms`;

    return next.handle().pipe(
      tap({
        next: () => this.logger.log(line(response.statusCode)),
        error: (err: unknown) => {
          const status = err instanceof HttpException ? err.getStatus() : 500;
          const msg = `${line(status)} - ${err instanceof Error ? err.message : String(err)}`;
          if (status >= 500) this.logger.error(msg);
          else this.logger.warn(msg);
        },
      }),
    );
  }
}
