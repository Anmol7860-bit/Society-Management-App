// ============================================================
// Auth Routes — /api/v1/auth/*
// ============================================================
// The middleware chain for POST /login:
//   1. loginRateLimiter  → Blocks if too many attempts (429)
//   2. validate(schema)  → Validates request body (422)
//   3. loginHandler      → Business logic (200/401/403/500)
// ============================================================

import { Router } from 'express';
import { loginHandler, refreshTokenHandler, firebaseLoginHandler } from '../controllers/authController';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { loginSchema, refreshTokenSchema, firebaseLoginSchema } from '../validators/authValidator';

const router = Router();

/**
 * POST /api/v1/auth/login
 *
 * Request body:
 *   { email?: string, phone?: string, password: string }
 *
 * Responses:
 *   200 — Login successful (user + tokens)
 *   401 — Invalid credentials
 *   403 — User inactive
 *   422 — Validation error
 *   429 — Too many requests
 *   500 — Internal error
 */
router.post(
  '/login',
  loginRateLimiter,           // Step 1: Rate limiting
  validate(loginSchema),       // Step 2: Payload validation
  loginHandler,                // Steps 3-10: Auth logic
);

/**
 * POST /api/v1/auth/refresh-token
 *
 * Request body:
 *   { refreshToken: string }
 *
 * Responses:
 *   200 — New tokens generated
 *   401 — Invalid/Expired/Revoked token
 *   422 — Validation error
 *   500 — Internal error
 */
router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  refreshTokenHandler,
);

/**
 * POST /api/v1/auth/firebase-login
 *
 * Verifies Firebase token, performs login if user exists.
 */
router.post(
  '/firebase-login',
  loginRateLimiter, // Reusing login rate limiter to protect this endpoint
  validate(firebaseLoginSchema),
  firebaseLoginHandler,
);

export default router;
