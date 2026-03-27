/**
 * @file logger.middleware.ts
 * @description HTTP request logger middleware using pino.
 * Logs method, URL, status code, and response time for every request.
 * In development uses pretty-printed output.
 * In production outputs structured JSON for log aggregators.
 */

import pino from 'pino';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export const logger = pino({
  level: 'info',
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
      : undefined,
});

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
};
