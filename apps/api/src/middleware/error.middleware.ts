/**
 * @file error.middleware.ts
 * @description Global error handler middleware. Catches all errors thrown
 * anywhere in the app and returns a consistent JSON error response.
 * Differentiates between known operational errors and unexpected crashes.
 * Never leaks stack traces in production.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { logger } from './logger.middleware';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.flatten().fieldErrors,
    });
  }

  // Known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  // Unknown errors
  logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled error');

  return res.status(500).json({
    error: 'Something went wrong',
    code: 'INTERNAL_ERROR',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
