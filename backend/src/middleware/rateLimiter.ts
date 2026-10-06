// ============================================================
// Rate Limiter — Throttle login attempts
// ============================================================
// Prevents brute-force attacks by limiting login attempts
// per IP address. Returns 429 TOO_MANY_REQUESTS when exceeded.
// ============================================================

import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * Login-specific rate limiter.
 * Default: 5 attempts per 15-minute window per IP.
 */
export const loginRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,       // 15 minutes
  max: config.rateLimit.maxAttempts,          // 5 attempts
  standardHeaders: true,                      // Return rate limit info in headers
  legacyHeaders: false,                       // Disable X-RateLimit-* headers

  // Custom response when limit is exceeded
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many login attempts. Please try again after 15 minutes.',
      },
    });
  },

  // Skip rate limiting in test environment
  skip: () => process.env.NODE_ENV === 'test',
});
