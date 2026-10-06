// ============================================================
// Auth Controller — Login business logic
// ============================================================
// Implements the 10-step processing flow from the Jira ticket:
//   1. Validate request payload         → validate middleware
//   2. Apply login rate limiting         → rateLimiter middleware
//   3. Find user by identifier           → ✅ this controller
//   4. Verify password using bcrypt      → ✅ this controller
//   5. Verify user is active             → ✅ this controller
//   6. Generate access token             → ✅ this controller
//   7. Generate refresh token            → ✅ this controller
//   8. Store refresh-token hash/session  → ✅ this controller
//   9. Record audit event                → ✅ this controller
//  10. Return safe user profile          → ✅ this controller
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
  verifyRefreshToken,
  compareRefreshToken,
} from '../services/tokenService';
import { InvalidCredentialsError, UserInactiveError, AppError } from '../utils/errors';
import { auditLog, logger } from '../utils/logger';
import { LoginInput, RefreshTokenInput, FirebaseLoginInput } from '../validators/authValidator';
import { verifyFirebaseIdToken } from '../services/firebaseAdmin';

// ── Safe User Serialization ────────────────────────────────────
// Security: "Never return password_hash"

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

/**
 * Convert a database user record to a safe profile.
 * Strips password_hash and internal fields.
 */
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

// ── Login Handler ──────────────────────────────────────────────

/**
 * POST /api/v1/auth/login
 *
 * Steps 1-2 (validation + rate limiting) are handled by middleware
 * in the route definition. This controller handles steps 3-10.
 */
export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, phone, password } = req.body as LoginInput;
    const identifier = email || phone || '';
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // ── Step 3: Find user by identifier ──────────────────────
    const user = email
      ? db.findUserByEmail(email)
      : db.findUserByPhone(phone!);

    if (!user) {
      // Security: "Use generic invalid-credential response"
      // Don't reveal whether the email/phone exists
      logger.warn('Login attempt: user not found', {
        identifier: email || phone,
        ip: clientIp,
      });

      // Record failed audit event
      db.createAuditLog({
        event: 'LOGIN_FAILED',
        user_id: null,
        ip_address: clientIp,
        user_agent: userAgent,
        details: {
          reason: 'USER_NOT_FOUND',
          identifier: email || phone,
        },
      });

      throw new InvalidCredentialsError();
    }

    // ── Step 4: Verify password using bcrypt ─────────────────
    // Security: "Never log plaintext password"
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      logger.warn('Login attempt: invalid password', {
        userId: user.id,
        ip: clientIp,
      });

      db.createAuditLog({
        event: 'LOGIN_FAILED',
        user_id: user.id,
        ip_address: clientIp,
        user_agent: userAgent,
        details: { reason: 'INVALID_PASSWORD' },
      });

      throw new InvalidCredentialsError();
    }

    // ── Step 5: Verify user is active ────────────────────────
    if (!user.is_active) {
      logger.warn('Login attempt: inactive user', {
        userId: user.id,
        ip: clientIp,
      });

      db.createAuditLog({
        event: 'LOGIN_FAILED',
        user_id: user.id,
        ip_address: clientIp,
        user_agent: userAgent,
        details: { reason: 'USER_INACTIVE' },
      });

      throw new UserInactiveError();
    }

    // ── Step 6: Generate access token ────────────────────────
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // ── Step 7: Generate refresh token ───────────────────────
    const sessionId = generateSessionId();
    const refreshToken = generateRefreshToken(user.id, sessionId);

    // ── Step 8: Store refresh-token hash/session record ──────
    // Security: "Never store plaintext refresh token"
    const refreshTokenHash = await hashRefreshToken(refreshToken);

    db.createSession({
      id: sessionId,
      user_id: user.id,
      refresh_token_hash: refreshTokenHash,
      ip_address: clientIp,
      user_agent: userAgent,
      expires_at: getRefreshTokenExpiry(),
    });

    // ── Step 9: Record successful login audit event ──────────
    auditLog('LOGIN_SUCCESS', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: clientIp,
      userAgent,
    });

    db.createAuditLog({
      event: 'LOGIN_SUCCESS',
      user_id: user.id,
      ip_address: clientIp,
      user_agent: userAgent,
      details: {
        role: user.role,
        sessionId,
      },
    });

    // ── Step 10: Return safe user profile ────────────────────
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: toSafeProfile(user),
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1 hour in seconds
      },
    });
  } catch (error) {
    next(error);
  }
}

// ── Refresh Token Handler ──────────────────────────────────────

/**
 * POST /api/v1/auth/refresh-token
 *
 * Validates refresh token, detects reuse, and issues new tokens.
 */
export async function refreshTokenHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // 1. Validate refresh token structure and signature
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const { userId, sessionId } = decoded;

    // 2. Find associated session
    const session = db.findSessionById(sessionId);

    if (!session) {
      throw new AppError('Session not found', 401, 'INVALID_SESSION');
    }

    // 3. Verify token has not been revoked (Token reuse detection)
    if (session.is_revoked) {
      logger.error('Refresh token reuse detected!', { userId, sessionId, ip: clientIp });
      
      // Revoke ALL active sessions for this user due to potential compromise
      db.revokeAllUserSessions(userId);
      
      db.createAuditLog({
        event: 'TOKEN_REUSE_DETECTED',
        user_id: userId,
        ip_address: clientIp,
        user_agent: userAgent,
        details: { sessionId },
      });

      throw new AppError('Session compromised. Please login again.', 401, 'TOKEN_REUSE_DETECTED');
    }

    // 4. Verify the submitted token matches the current hash for this session
    const isMatch = await compareRefreshToken(refreshToken, session.refresh_token_hash);
    
    if (!isMatch) {
      logger.error('Refresh token reuse detected! Hash mismatch.', { userId, sessionId, ip: clientIp });
      
      // Revoke ALL active sessions
      db.revokeAllUserSessions(userId);
      
      db.createAuditLog({
        event: 'TOKEN_REUSE_DETECTED',
        user_id: userId,
        ip_address: clientIp,
        user_agent: userAgent,
        details: { sessionId, reason: 'HASH_MISMATCH' },
      });

      throw new AppError('Session compromised. Please login again.', 401, 'TOKEN_REUSE_DETECTED');
    }

    // 5. Verify user is active
    const user = db.findUserByPhone(userId) || db.users.find(u => u.id === userId); // fallback to ID
    if (!user || !user.is_active) {
      throw new UserInactiveError();
    }

    // 6. Generate new access token
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // 7. Rotate refresh token (Generate new)
    const newRefreshToken = generateRefreshToken(user.id, sessionId);
    const newRefreshTokenHash = await hashRefreshToken(newRefreshToken);

    // 8. Persist the new refresh-token hash (Replace previous state)
    // In our simplified DB, we update the existing session record
    session.refresh_token_hash = newRefreshTokenHash;
    session.expires_at = getRefreshTokenExpiry();
    session.ip_address = clientIp; // Update IP tracking
    session.user_agent = userAgent;

    // 9. Return new authentication information
    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken, // Include the new refresh token!
        expiresIn: 3600,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ── Firebase Login Handler ─────────────────────────────────────

/**
 * POST /api/v1/auth/firebase-login
 *
 * Verifies a Firebase ID token, finds the user by phone number,
 * and issues our own access/refresh tokens.
 */
export async function firebaseLoginHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { idToken } = req.body as FirebaseLoginInput;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // 1. Verify Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseIdToken(idToken);
    } catch (error: any) {
      logger.warn('Firebase token verification failed', {
        ip: clientIp,
        message: error.message,
      });
      throw new AppError('Invalid Firebase token', 401, 'INVALID_FIREBASE_TOKEN');
    }

    // 2. Extract phone number (Firebase uses E.164 format: +919876543210)
    const firebasePhone = decodedToken.phone_number;
    if (!firebasePhone) {
      throw new AppError('Firebase token does not contain a phone number', 400, 'MISSING_PHONE_NUMBER');
    }

    // Convert E.164 to local 10-digit format (assuming Indian numbers for now)
    // In a real app, you might want a proper phone number parsing library
    const localPhone = firebasePhone.replace('+91', '');

    // 3. Find user by phone number
    const user = db.findUserByPhone(localPhone);

    if (!user) {
      logger.warn('Firebase Login attempt: user not found', {
        phone: localPhone,
        ip: clientIp,
      });

      db.createAuditLog({
        event: 'LOGIN_FAILED',
        user_id: null,
        ip_address: clientIp,
        user_agent: userAgent,
        details: { reason: 'USER_NOT_FOUND', phone: localPhone },
      });

      // Same generic response as regular login
      throw new InvalidCredentialsError();
    }

    // 4. Verify user is active
    if (!user.is_active) {
      logger.warn('Firebase Login attempt: inactive user', {
        userId: user.id,
        ip: clientIp,
      });

      db.createAuditLog({
        event: 'LOGIN_FAILED',
        user_id: user.id,
        ip_address: clientIp,
        user_agent: userAgent,
        details: { reason: 'USER_INACTIVE' },
      });

      throw new UserInactiveError();
    }

    // 5. Generate access token
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // 6. Generate refresh token
    const sessionId = generateSessionId();
    const refreshToken = generateRefreshToken(user.id, sessionId);
    const refreshTokenHash = await hashRefreshToken(refreshToken);

    // 7. Store session record
    db.createSession({
      id: sessionId,
      user_id: user.id,
      refresh_token_hash: refreshTokenHash,
      ip_address: clientIp,
      user_agent: userAgent,
      expires_at: getRefreshTokenExpiry(),
    });

    // 8. Record audit event
    auditLog('FIREBASE_LOGIN_SUCCESS', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: clientIp,
      userAgent,
    });

    db.createAuditLog({
      event: 'LOGIN_SUCCESS',
      user_id: user.id,
      ip_address: clientIp,
      user_agent: userAgent,
      details: { role: user.role, sessionId, method: 'firebase' },
    });

    // 9. Return safe user profile and tokens
    res.status(200).json({
      success: true,
      message: 'Login successful via Firebase',
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
