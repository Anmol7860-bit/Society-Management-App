// ============================================================
// Request ID Middleware
// ============================================================
// Attaches a unique UUID to every inbound request and echoes
// it back in the X-Request-ID response header.
//
// Benefits:
//   - Trace a single request through all log lines
//   - Client can correlate retries / errors with support
//   - Enables distributed tracing when multiple services exist
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Reads the incoming X-Request-ID header (if provided by the caller),
 * or generates a new UUID. Attaches it to req.requestId and echoes
 * it back as a response header.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  // Allow clients to supply their own request ID (e.g., mobile app retries)
  const incomingId = req.headers['x-request-id'];
  const id = typeof incomingId === 'string' && incomingId.trim()
    ? incomingId.trim()
    : uuidv4();

  req.requestId = id;

  // Always echo the request ID back so the caller can use it for support
  res.setHeader('X-Request-ID', id);

  next();
}
