// ============================================================
// Error Handler — Global error handling middleware
// ============================================================
// Catches all errors thrown in routes/controllers and returns
// a consistent JSON error response. Must be the LAST middleware.
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Global error handler — catches all errors and returns consistent JSON.
 * Must be registered AFTER all routes: app.use(errorHandler)
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── Known operational errors (our custom AppError subclasses) ──
  if (err instanceof AppError) {
    const response: Record<string, unknown> = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // Include field-level errors for validation failures
    if (err instanceof ValidationError) {
      response.error = {
        ...(response.error as object),
        details: err.errors,
      };
    }

    // Log at appropriate level
    if (err.statusCode >= 500) {
      logger.error(`${err.code}: ${err.message}`, { stack: err.stack });
    } else {
      logger.warn(`${err.code}: ${err.message}`);
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // ── Unknown/unexpected errors ──────────────────────────────
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    },
  });
}
