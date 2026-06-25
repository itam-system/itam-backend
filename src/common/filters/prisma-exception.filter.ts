import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { TIMEZONE } from '../constants/app.constant.js';

dayjs.extend(utc);
dayjs.extend(timezone);

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'A database error occurred';

    switch (exception.code) {
      // Unique constraint violation
      case 'P2002': {
        statusCode = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[])?.join(', ') || 'field';
        errorCode = `DUPLICATE_${target.toUpperCase().replace(/\s/g, '_')}`;
        message = `A record with this ${target} already exists`;
        break;
      }

      // Record not found
      case 'P2025': {
        statusCode = HttpStatus.NOT_FOUND;
        errorCode = 'NOT_FOUND';
        message = 'The requested record was not found';
        break;
      }

      // Foreign key constraint
      case 'P2003': {
        statusCode = HttpStatus.BAD_REQUEST;
        errorCode = 'INVALID_REFERENCE';
        message = 'Referenced record does not exist';
        break;
      }

      default:
        break;
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message,
        statusCode,
      },
      timestamp: dayjs().tz(TIMEZONE).format(),
    });
  }
}
