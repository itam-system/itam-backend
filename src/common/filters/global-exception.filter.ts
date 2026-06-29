import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { TIMEZONE } from '../constants/app.constant.js';
import * as Sentry from '@sentry/node';

dayjs.extend(utc);
dayjs.extend(timezone);

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;

        // Handle BusinessException format
        if (res.error && typeof res.error === 'object') {
          const error = res.error as Record<string, unknown>;
          errorCode = (error.code as string) || errorCode;
          message = (error.message as string) || message;
        }
        // Handle class-validator ValidationPipe errors
        else if (Array.isArray(res.message)) {
          errorCode = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = res.message;
        } else {
          message = (res.message as string) || message;
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    if (statusCode >= 500) {
      Sentry.captureException(exception, {
        tags: { statusCode: String(statusCode), errorCode },
      });
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message,
        statusCode,
        ...(details ? { details } : {}),
      },
      timestamp: dayjs().tz(TIMEZONE).format(),
    });
  }
}
