// ============================================================
// Validate Middleware — Zod schema validation for requests
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

/**
 * Creates Express middleware that validates req.body against a Zod schema.
 * If validation fails, throws a 422 ValidationError with field-level details.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Parse and replace body with validated/typed data
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(new ValidationError(fieldErrors));
      } else {
        next(error);
      }
    }
  };
}
