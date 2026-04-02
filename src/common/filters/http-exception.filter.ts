import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorResponse = {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  detail?: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!isHttpException) {
      const err =
        exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        `${err.message} path=${request.method} ${request.url}`,
        err.stack,
      );
      const isProduction = process.env.NODE_ENV === 'production';
      const body: ErrorResponse = {
        statusCode: status,
        error: 'Internal Server Error',
        message: 'Erro interno do servidor',
        timestamp: new Date().toISOString(),
        path: request.url,
        ...(!isProduction && { detail: err.message }),
      };
      response.status(status).json(body);
      return;
    }

    const exceptionResponse = exception.getResponse();
    const normalizedResponse =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse, error: exception.name }
        : (exceptionResponse as Record<string, unknown>);

    const body: ErrorResponse = {
      statusCode: status,
      error: String(normalizedResponse.error ?? exception.name),
      message: (normalizedResponse.message as string | string[]) ?? 'Erro',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }
}
