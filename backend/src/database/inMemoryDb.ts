// ============================================================
// In-Memory Database — Temporary data store
// ============================================================
// This simulates a SQL database for development.
// Will be replaced with PostgreSQL + Prisma when the DB is set up.
//
// Tables simulated:
//   - users         (id, email, phone, password_hash, name, role, ...)
//   - user_sessions (id, user_id, refresh_token_hash, ...)
//   - audit_logs    (id, event, user_id, ...)
//   - otp_records   (id, phone, otp_hash, expires_at, attempts, ...)
// ============================================================

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

// ── Types ──────────────────────────────────────────────────────

export type UserRole = 'resident' | 'guard' | 'admin';

export interface UserRecord {
  id: string;
  email: string;
  phone: string;
  password_hash: string;
  name: string;
  role: UserRole;
  flat_number: string | null;
  building: string | null;
  gate_assignment: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  ip_address: string;
  user_agent: string;
  expires_at: string;
  created_at: string;
  is_revoked: boolean;
}

export interface AuditLogRecord {
  id: string;
  event: string;
  user_id: string | null;
  ip_address: string;
  user_agent: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface OtpRecord {
  id: string;
  phone: string;
  otp_hash: string;
  attempts: number;       // Number of verification attempts
  max_attempts: number;   // Max allowed attempts (default: 5)
  is_used: boolean;       // Whether the OTP has been successfully used
  expires_at: string;     // ISO timestamp
  created_at: string;
}

// ── Seed Data ──────────────────────────────────────────────────

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.bcryptSaltRounds);
}

class InMemoryDatabase {
  public users: UserRecord[] = [];
  public sessions: SessionRecord[] = [];
  public auditLogs: AuditLogRecord[] = [];
  public otpRecords: OtpRecord[] = [];

  private initialized = false;

  /**
   * Seed the database with test users.
   * Call this once at server startup.
   */
  async seed(): Promise<void> {
    if (this.initialized) return;

    const now = new Date().toISOString();

    this.users = [
      {
        id: uuidv4(),
        email: 'resident@gatekeep.dev',
        phone: '8310717822',
        password_hash: await hashPassword('Resident@123'),
        name: 'Anmol Bhandare',
        role: 'resident',
        flat_number: 'A-1204',
        building: 'Tower A - Prestige Lakeside',
        gate_assignment: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        email: 'guard@gatekeep.dev',
        phone: '9876543211',
        password_hash: await hashPassword('Guard@123'),
        name: 'Rajesh Kumar',
        role: 'guard',
        flat_number: null,
        building: null,
        gate_assignment: 'Main Gate - North',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        email: 'admin@gatekeep.dev',
        phone: '9876543212',
        password_hash: await hashPassword('Admin@123'),
        name: 'Priya Sharma',
        role: 'admin',
        flat_number: null,
        building: null,
        gate_assignment: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        email: 'inactive@gatekeep.dev',
        phone: '9876543213',
        password_hash: await hashPassword('Inactive@123'),
        name: 'Disabled User',
        role: 'resident',
        flat_number: 'B-301',
        building: 'Tower B',
        gate_assignment: null,
        is_active: false, // ← This user is INACTIVE
        created_at: now,
        updated_at: now,
      },
    ];

    this.initialized = true;
  }

  // ── User Queries ──────────────────────────────────────────

  /** Find user by email (case-insensitive) */
  findUserByEmail(email: string): UserRecord | undefined {
    return this.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
  }

  /** Find user by phone number */
  findUserByPhone(phone: string): UserRecord | undefined {
    return this.users.find((u) => u.phone === phone);
  }

  /** Find user by email OR phone */
  findUserByIdentifier(identifier: string): UserRecord | undefined {
    return this.findUserByEmail(identifier) || this.findUserByPhone(identifier);
  }

  // ── Session Queries ───────────────────────────────────────

  /** Create a new session record */
  createSession(session: Omit<SessionRecord, 'created_at' | 'is_revoked'>): SessionRecord {
    const record: SessionRecord = {
      ...session,
      created_at: new Date().toISOString(),
      is_revoked: false,
    };
    this.sessions.push(record);
    return record;
  }

  /** Find session by ID */
  findSessionById(sessionId: string): SessionRecord | undefined {
    return this.sessions.find((s) => s.id === sessionId);
  }

  /** Find sessions by user ID */
  findSessionsByUserId(userId: string): SessionRecord[] {
    return this.sessions.filter((s) => s.user_id === userId);
  }

  /** Revoke a session */
  revokeSession(sessionId: string): void {
    const session = this.findSessionById(sessionId);
    if (session) {
      session.is_revoked = true;
    }
  }

  /** Revoke all active sessions for a user (called on token reuse) */
  revokeAllUserSessions(userId: string): void {
    this.sessions.forEach((s) => {
      if (s.user_id === userId) {
        s.is_revoked = true;
      }
    });
  }

  /** Delete a session by ID */
  deleteSession(sessionId: string): boolean {
    const index = this.sessions.findIndex((s) => s.id === sessionId);
    if (index !== -1) {
      this.sessions.splice(index, 1);
      return true;
    }
    return false;
  }

  // ── Audit Log ─────────────────────────────────────────────

  /** Record an audit event */
  createAuditLog(log: Omit<AuditLogRecord, 'id' | 'created_at'>): AuditLogRecord {
    const record: AuditLogRecord = {
      ...log,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    this.auditLogs.push(record);
    return record;
  }

  // ── OTP Records ───────────────────────────────────────────

  /** Create a new OTP record */
  createOtpRecord(record: Omit<OtpRecord, 'id' | 'created_at'>): OtpRecord {
    const otpRecord: OtpRecord = {
      ...record,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    this.otpRecords.push(otpRecord);
    return otpRecord;
  }

  /** Find the latest valid (unused, unexpired) OTP for a phone */
  findActiveOtpByPhone(phone: string): OtpRecord | undefined {
    const now = new Date().toISOString();
    return this.otpRecords.find(
      (r) =>
        r.phone === phone &&
        !r.is_used &&
        r.attempts < r.max_attempts &&
        r.expires_at > now,
    );
  }

  /** Increment the attempt counter on an OTP record */
  incrementOtpAttempts(otpId: string): void {
    const record = this.otpRecords.find((r) => r.id === otpId);
    if (record) {
      record.attempts += 1;
    }
  }

  /** Mark an OTP as used (after successful verification) */
  markOtpUsed(otpId: string): void {
    const record = this.otpRecords.find((r) => r.id === otpId);
    if (record) {
      record.is_used = true;
    }
  }

  /** Invalidate all active OTPs for a phone (called before sending a new one) */
  invalidateOtpsForPhone(phone: string): void {
    this.otpRecords.forEach((r) => {
      if (r.phone === phone && !r.is_used) {
        r.is_used = true;
      }
    });
  }

  /** Count OTPs sent to a phone in the last N milliseconds */
  countRecentOtps(phone: string, windowMs: number): number {
    const cutoff = new Date(Date.now() - windowMs).toISOString();
    return this.otpRecords.filter(
      (r) => r.phone === phone && r.created_at > cutoff,
    ).length;
  }
}

/** Singleton database instance */
export const db = new InMemoryDatabase();
