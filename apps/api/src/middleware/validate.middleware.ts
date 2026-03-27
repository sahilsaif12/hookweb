/**
 * @file validate.middleware.ts
 * @description Zod-based request validation middleware factory.
 * Validates req.body, req.query, and req.params against a Zod schema.
 * Throws a ZodError on failure which is caught by the global error handler.
 * Usage: router.post('/route', validate({ body: mySchema }), handler)
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

interface ValidateSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate = (schemas: ValidateSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};
