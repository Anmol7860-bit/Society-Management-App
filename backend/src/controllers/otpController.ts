// ============================================================
// OTP Controller — Send & Verify OTP business logic
// ============================================================
// Two handlers:
//   1. sendOtpHandler  → Generate OTP, store hash, send via SMS
//   2. verifyOtpHandler → Verify OTP, login user, return tokens
// ============================================================

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db, UserRecord } from '../database/inMemoryDb';
import {
  generateAccessToken,
  generateRefreshToken,
  generateSessionId,
  hashRefreshToken,
  getRefreshTokenExpiry,
} from '../services/tokenService';
import {
  smsProvider,
  generateOtp,
  OTP_EXPIRY_MINUTES,
  OTP_SEND_LIMIT,
  OTP_SEND_WINDOW_MS,
} from '../services/smsService';
import { AppError, InvalidCredentialsError, UserInactiveError } from '../utils/errors';
import { auditLog, logger } from '../utils/logger';
import { OtpSendInput, OtpVerifyInput } from '../validators/otpValidator';

// ── Safe User Serialization (shared with authController) ───────

interface SafeUserProfile {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: string;
  flatNumber: string | null;
  building: string | null;
  gateAssignment: string | null;
  isActive: boolean;
}

function toSafeProfile(user: UserRecord): SafeUserProfile {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role,
    flatNumber: user.flat_number,
    building: user.building,
    gateAssignment: user.gate_assignment,
    isActive: user.is_active,
  };
}

// ── Send OTP Handler ───────────────────────────────────────────

/**
 * POST /api/v1/auth/otp/send
 *
 * 1. Validate phone (done by middleware)
 * 2. Check OTP send rate limit (max 3 per 10 min per phone)
 * 3. Generate 6-digit OTP
 * 4. Hash OTP before storage
 * 5. Invalidate any previous active OTPs for this phone
 * 6. Store new OTP record
 * 7. Send OTP via SMS provider
 * 8. Return generic success (don't reveal if phone exists)
 */
export async function sendOtpHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { phone } = req.body as OtpSendInput;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // ── Step 2: Check OTP send rate limit ────────────────────
    const recentCount = db.countRecentOtps(phone, OTP_SEND_WINDOW_MS);
    if (recentCount >= OTP_SEND_LIMIT) {
      logger.warn('OTP rate limit exceeded', { phone, recentCount, ip: clientIp });

      db.createAuditLog({
        event: 'OTP_RATE_LIMITED',
        user_id: null,
        ip_address: clientIp,
        user_agent: userAgent,
        details: { phone, recentCount },
      });

      throw new AppError(
        'Too many OTP requests. Please try again after 10 minutes.',
        429,
        'OTP_RATE_LIMITED',
      );
    }

    // ── Step 3: Generate OTP ─────────────────────────────────
    const otp = generateOtp();

    // ── Step 4: Hash OTP before storage ──────────────────────
    const otpHash = await bcrypt.hash(otp, 6);

    // ── Step 5: Invalidate previous OTPs for this phone ──────
    db.invalidateOtpsForPhone(phone);

    // ── Step 6: Store new OTP record ─────────────────────────
    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
    ).toISOString();

    db.createOtpRecord({
      phone,
      otp_hash: otpHash,
      attempts: 0,
      max_attempts: 5,
      is_used: false,
      expires_at: expiresAt,
    });

    // ── Step 7: Send OTP via SMS provider ────────────────────
    // Check if the user exists (for logging only, not for response)
    const user = db.findUserByPhone(phone);

    if (user) {
      await smsProvider.sendOtp(phone, otp);
    } else {
      // User doesn't exist — log it but still return success
      // Security: Generic response prevents phone number enumeration
      logger.info('OTP requested for unregistered phone', {
        phone,
        ip: clientIp,
      });
    }

    // Audit log
    db.createAuditLog({
      event: 'OTP_SENT',
      user_id: user?.id || null,
      ip_address: clientIp,
      user_agent: userAgent,
      details: { phone, provider: smsProvider.name },
    });

    // ── Step 8: Return generic success ───────────────────────
    res.status(200).json({
      success: true,
      message: 'If this phone number is registered, you will receive an OTP shortly.',
      data: {
        expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
        phone,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ── Verify OTP Handler ─────────────────────────────────────────

/**
 * POST /api/v1/auth/otp/verify
 *
 * 1. Validate phone + OTP (done by middleware)
 * 2. Find active OTP record for phone
 * 3. Compare submitted OTP against stored hash
 * 4. Find user by phone
 * 5. Verify user is active
 * 6. Mark OTP as used
 * 7. Generate access token
 * 8. Generate refresh token
 * 9. Store session
 * 10. Audit log
 * 11. Return safe profile + tokens
 */
export async function verifyOtpHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { phone, otp } = req.body as OtpVerifyInput;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // ── Step 2: Find active OTP record ───────────────────────
    const otpRecord = db.findActiveOtpByPhone(phone);

    if (!otpRecord) {
      logger.warn('OTP verify: no active OTP found', { phone, ip: clientIp });

      db.createAuditLog({
        event: 'OTP_VERIFY_FAILED',
        user_id: null,
        ip_address: clientIp,
        user_agent: userAgent,
        details: { phone, reason: 'NO_ACTIVE_OTP' },
      });

      throw new AppError(
        'OTP has expired or is invalid. Please request a new one.',
        401,
        'OTP_EXPIRED',
      );
    }

    // ── Step 3: Compare OTP against stored hash ──────────────
    db.incrementOtpAttempts(otpRecord.id);

    const isOtpValid = await bcrypt.compare(otp, otpRecord.otp_hash);

    if (!isOtpValid) {
      const remainingAttempts = otpRecord.max_attempts - (otpRecord.attempts + 1);

      logger.warn('OTP verify: invalid OTP', {
        phone,
        ip: clientIp,
        remainingAttempts,
      });

      db.createAuditLog({
        event: 'OTP_VERIFY_FAILED',
        user_id: null,
        ip_address: clientIp,
        user_agent: userAgent,
        details: { phone, reason: 'INVALID_OTP', remainingAttempts },
      });

      if (remainingAttempts <= 0) {
        throw new AppError(
          'Too many incorrect attempts. Please request a new OTP.',
          401,
          'OTP_MAX_ATTEMPTS',
        );
      }

      throw new AppError(
        `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
        401,
        'INVALID_OTP',
      );
    }

    // ── Step 4: Find user by phone ───────────────────────────
    const user = db.findUserByPhone(phone);

    if (!user) {
      // This shouldn't happen if OTP was sent only to registered phones,
      // but handle it defensively
      throw new InvalidCredentialsError();
    }

    // ── Step 5: Verify user is active ────────────────────────
    if (!user.is_active) {
      logger.warn('OTP verify: inactive user', { userId: user.id, ip: clientIp });

      db.createAuditLog({
        event: 'OTP_VERIFY_FAILED',
        user_id: user.id,
        ip_address: clientIp,
        user_agent: userAgent,
        details: { reason: 'USER_INACTIVE' },
      });

      throw new UserInactiveError();
    }

    // ── Step 6: Mark OTP as used ─────────────────────────────
    db.markOtpUsed(otpRecord.id);

    // ── Step 7: Generate access token ────────────────────────
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // ── Step 8: Generate refresh token ───────────────────────
    const sessionId = generateSessionId();
    const refreshToken = generateRefreshToken(user.id, sessionId);

    // ── Step 9: Store session ────────────────────────────────
    const refreshTokenHash = await hashRefreshToken(refreshToken);

    db.createSession({
      id: sessionId,
      user_id: user.id,
      refresh_token_hash: refreshTokenHash,
      ip_address: clientIp,
      user_agent: userAgent,
      expires_at: getRefreshTokenExpiry(),
    });

    // ── Step 10: Audit log ───────────────────────────────────
    auditLog('OTP_LOGIN_SUCCESS', {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      ip: clientIp,
      userAgent,
    });

    db.createAuditLog({
      event: 'OTP_LOGIN_SUCCESS',
      user_id: user.id,
      ip_address: clientIp,
      user_agent: userAgent,
      details: { role: user.role, sessionId, method: 'otp' },
    });

    // ── Step 11: Return safe profile + tokens ────────────────
    res.status(200).json({
      success: true,
      message: 'OTP verified. Login successful.',
      data: {
        user: toSafeProfile(user),
        accessToken,
        refreshToken,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    next(error);
  }
}
