import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const startTime = Date.now();

    // 📥 Log cuando llega la petición a la API
    // prettier-ignore
    this.logger.log(`📥 --> [${method}] ${originalUrl} - IP: ${ip}`);

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const errorMessage = (res as any).locals?.errorMessage;

      if (statusCode >= 400) {
        const errorDetail = errorMessage
          ? ` - ${typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage}`
          : '';
        // prettier-ignore
        this.logger.warn(`❌ <-- [${method}] ${originalUrl} ${statusCode} +${duration}ms${errorDetail}`);
      } else {
        // prettier-ignore
        this.logger.log(`📤 <-- [${method}] ${originalUrl} ${statusCode} +${duration}ms`);
      }
    });

    next();
  }
}
