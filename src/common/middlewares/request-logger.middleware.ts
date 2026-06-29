import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const userAgent = req.headers['user-agent'] || '-';
    const requestId = req.headers['x-request-id'] || '-';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;

      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms - ${userAgent} ${ip}`;

      if (statusCode >= 500) {
        this.logger.error(message, undefined, requestId);
      } else if (statusCode >= 400) {
        this.logger.warn(message, requestId);
      } else {
        this.logger.log(message, requestId);
      }
    });

    next();
  }
}
