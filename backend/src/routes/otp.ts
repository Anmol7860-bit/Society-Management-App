// ============================================================
// OTP Routes — /api/v1/auth/otp/*
// ============================================================

import { Router } from 'express';
import { sendOtpHandler, verifyOtpHandler } from '../controllers/otpController';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { otpSendSchema, otpVerifySchema } from '../validators/otpValidator';

const router = Router();

/**
 * POST /api/v1/auth/otp/send
 *
 * Request body: { phone: "9876543210" }
 *
 * Responses:
 *   200 — OTP sent (or generic success if phone not found)
 *   422 — Validation error
 *   429 — Too many OTP requests
 *   500 — Internal error
 */
router.post(
  '/send',
  loginRateLimiter,
  validate(otpSendSchema),
  sendOtpHandler,
);

/**
 * POST /api/v1/auth/otp/verify
 *
 * Request body: { phone: "9876543210", otp: "123456" }
 *
 * Responses:
 *   200 — OTP verified, login successful (user + tokens)
 *   401 — Invalid/expired OTP
 *   403 — User inactive
 *   422 — Validation error
 *   429 — Too many requests
 *   500 — Internal error
 */
router.post(
  '/verify',
  loginRateLimiter,
  validate(otpVerifySchema),
  verifyOtpHandler,
);

export default router;
