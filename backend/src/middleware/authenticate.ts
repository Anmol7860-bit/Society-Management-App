// ============================================================
// Authentication Middleware — Protect API routes
// ============================================================
// Sits in front of any protected route. Performs the following:
//
//   1. Read Authorization header (expected: "Bearer <token>")
//   2. Reject missing token → 401 TOKEN_MISSING
//   3. Validate JWT structure and signature
//   4. Reject invalid tokens → 401 TOKEN_INVALID
//   5. Reject expired tokens → 401 TOKEN_EXPIRED
//   6. Verify the token type is 'access' (not 'refresh')
//   7. Extract userId, email, role from the decoded payload
//   8. Derive societyId from the user record
//   9. Attach req.ctx = { userId, societyId, role }
//  10. Pass to the next handler
//
// Security:
//   - Generic messages prevent information leakage
//   - Raw token values are NEVER written to logs
//   - Only the userId is logged (not email/role) for tracing
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { verifyAccessToken } from '../services/tokenService';
import { AppError } from '../utils/errors';
import { db } from '../database/inMemoryDb';
import { logger } from '../utils/logger';

// ── Errors ──────────────────────────────────────────────────────

export class TokenMissingError extends AppError {
  constructor() {
    super(
      'Authentication required. Please provide a valid Bearer token.',
      401,
      'TOKEN_MISSING',
    );
  }
}

export class TokenInvalidError extends AppError {
  constructor() {
    super(
      'The provided token is invalid. Please log in again.',
      401,
      'TOKEN_INVALID',
    );
  }
}

export class TokenExpiredError2 extends AppError {
  constructor() {
    super(
      'Your session has expired. Please log in again.',
      401,
      'TOKEN_EXPIRED',
    );
  }
}

// ── Middleware ──────────────────────────────────────────────────

/**
 * Authenticate middleware.
 *
 * Attach to any route that requires a logged-in user:
 *
 *   router.get('/profile', authenticate, profileHandler);
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Read Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new TokenMissingError();
    }

    // 2. Extract raw token (never log this value)
    const rawToken = authHeader.slice(7).trim();

    if (!rawToken) {
      throw new TokenMissingError();
    }

    // 3. Verify and decode the JWT
    let decoded;
    try {
      decoded = verifyAccessToken(rawToken);
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        // Log with request ID for traceability (not the token itself)
        logger.debug('Access token expired', {
          requestId: req.requestId,
        });
        throw new TokenExpiredError2();
      }

      if (err instanceof JsonWebTokenError) {
        // Covers: invalid signature, malformed, wrong algorithm, etc.
        logger.debug('Access token invalid', {
          requestId: req.requestId,
          reason: err.message, // safe — no token value exposed
        });
        throw new TokenInvalidError();
      }

      // Unknown JWT error — bubble up to global error handler
      throw err;
    }

    // 4. Verify this is an access token (not a refresh token)
    if (decoded.type !== 'access') {
      logger.debug('Wrong token type presented', {
        requestId: req.requestId,
        type: decoded.type,
      });
      throw new TokenInvalidError();
    }

    // 5. Fetch the user from the database to get societyId
    //    and verify the account is still active
    const user = db.users.find((u) => u.id === decoded.userId);

    if (!user || !user.is_active) {
      // Account was deactivated after token was issued
      logger.warn('Token presented for inactive/deleted user', {
        requestId: req.requestId,
        userId: decoded.userId,
      });
      throw new TokenInvalidError();
    }

    // 6. Derive societyId
    //    Currently all users belong to a single society.
    //    Once multi-tenancy is added this will be a FK lookup.
    const societyId = 'society-001';

    // 7. Attach authentication context to the request
    req.ctx = {
      userId: user.id,
      societyId,
      role: user.role,
    };

    // 8. Trace log — userId only, no email/role to avoid over-logging PII
    logger.debug('Request authenticated', {
      requestId: req.requestId,
      userId: user.id,
    });

    next();
  } catch (error) {
    next(error);
  }
}

// ── Role Guard ──────────────────────────────────────────────────

/**
 * Role guard factory. Use AFTER `authenticate`.
 *
 * Rejects requests where the authenticated user's role is not
 * in the allowed set. Returns 403 FORBIDDEN.
 *
 * Usage:
 *   router.get('/admin/panel', authenticate, requireRole('admin'), handler);
 *   router.get('/duty', authenticate, requireRole('guard', 'admin'), handler);
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { role } = req.ctx;

    if (!allowedRoles.includes(role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource.',
        },
      });
      return;
    }

    next();
  };
}
