// ============================================================
// Token Service — JWT generation and verification
// ============================================================
// Handles access token and refresh token lifecycle.
// Access tokens are short-lived (1h), refresh tokens long-lived (7d).
// Refresh tokens are NEVER stored in plain text — only their
// bcrypt hash is saved in the sessions table.
// ============================================================

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { UserRole } from '../database/inMemoryDb';

// ── Token Payload Types ────────────────────────────────────────

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  jti: string;
  type: 'refresh';
}

// ── Token Generation ───────────────────────────────────────────

/**
 * Generate a short-lived access token (default: 1 hour).
 * Contains user ID, email, and role for RBAC checks.
 */
export function generateAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn as string },
  );
}

/**
 * Generate a long-lived refresh token (default: 7 days).
 * Contains only user ID and session ID — minimal data.
 */
export function generateRefreshToken(userId: string, sessionId: string): string {
  return jwt.sign(
    { userId, sessionId, jti: uuidv4(), type: 'refresh' } as RefreshTokenPayload,
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn as string },
  );
}

// ── Token Verification ─────────────────────────────────────────

/**
 * Verify and decode an access token.
 * Throws if expired, malformed, or wrong secret.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;
}

/**
 * Verify and decode a refresh token.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as RefreshTokenPayload;
}

// ── Refresh Token Hashing ──────────────────────────────────────
// Per security requirement: "Never store plaintext refresh token"

/**
 * Hash a refresh token before storing in the database.
 * To avoid bcrypt's 72-byte truncation limit on long JWTs, we pre-hash with SHA-256.
 */
export async function hashRefreshToken(token: string): Promise<string> {
  const sha256Hash = crypto.createHash('sha256').update(token).digest('base64');
  return bcrypt.hash(sha256Hash, 6); // Lower rounds — refresh tokens rotate frequently
}

/**
 * Compare a plaintext refresh token against its stored hash.
 */
export async function compareRefreshToken(token: string, hash: string): Promise<boolean> {
  const sha256Hash = crypto.createHash('sha256').update(token).digest('base64');
  return bcrypt.compare(sha256Hash, hash);
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Generate a unique session ID for tracking refresh tokens.
 */
export function generateSessionId(): string {
  return uuidv4();
}

/**
 * Calculate token expiry as a Date object.
 */
export function getRefreshTokenExpiry(): string {
  const days = parseInt(config.jwt.refreshExpiresIn as string) || 7;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry.toISOString();
}
