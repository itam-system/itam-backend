import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { TIMEZONE } from '../constants/app.constant.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the response already has the envelope format, pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // If data has a meta property (paginated responses), extract it
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true as const,
            data: data.data,
            meta: data.meta,
            timestamp: dayjs().tz(TIMEZONE).format(),
          };
        }

        return {
          success: true as const,
          data,
          timestamp: dayjs().tz(TIMEZONE).format(),
        };
      }),
    );
  }
}
