// ============================================================
// SMS Service — Pluggable SMS/OTP delivery
// ============================================================
// Architecture: Strategy pattern for swappable SMS providers.
//
// Development : ConsoleSmsProvider (logs OTP to terminal)
// Production  : Swap to TwilioSmsProvider or MSG91SmsProvider
//               by changing SMS_PROVIDER in .env
//
// Adding a new provider:
//   1. Create a class implementing SmsProvider interface
//   2. Add it to the switch in getSmsProvider()
//   3. Set SMS_PROVIDER=your_provider in .env
// ============================================================

import crypto from 'crypto';
import { logger } from '../utils/logger';

// ── Interface ──────────────────────────────────────────────────

export interface SmsProvider {
  /** Send an OTP to the given phone number. Returns true if sent. */
  sendOtp(phone: string, otp: string): Promise<boolean>;
  /** Provider name for logging */
  readonly name: string;
}

// ── Console Provider (Development) ─────────────────────────────

class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    // Big visible banner in terminal so you can't miss it
    logger.info(`
  ┌──────────────────────────────────────────┐
  │  📱 DEV SMS — OTP Delivery               │
  │                                          │
  │  Phone : ${phone.padEnd(30)}│
  │  OTP   : ${otp.padEnd(30)}│
  │                                          │
  │  ⚠️  This is a development-only message   │
  │  In production, this will be a real SMS  │
  └──────────────────────────────────────────┘
    `);
    return true;
  }
}

// ── Twilio Provider (Production — Placeholder) ─────────────────

// class TwilioSmsProvider implements SmsProvider {
//   readonly name = 'twilio';
//
//   async sendOtp(phone: string, otp: string): Promise<boolean> {
//     // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
//     // await client.messages.create({
//     //   body: `Your GateKeep OTP is: ${otp}. Valid for 5 minutes.`,
//     //   from: process.env.TWILIO_PHONE_NUMBER,
//     //   to: `+91${phone}`,
//     // });
//     return true;
//   }
// }

// ── MSG91 Provider (Production — Placeholder) ──────────────────

// class MSG91SmsProvider implements SmsProvider {
//   readonly name = 'msg91';
//
//   async sendOtp(phone: string, otp: string): Promise<boolean> {
//     // const response = await fetch('https://api.msg91.com/api/v5/otp', {
//     //   method: 'POST',
//     //   headers: {
//     //     'Content-Type': 'application/json',
//     //     'authkey': process.env.MSG91_AUTH_KEY!,
//     //   },
//     //   body: JSON.stringify({
//     //     mobile: `91${phone}`,
//     //     otp,
//     //     template_id: process.env.MSG91_TEMPLATE_ID,
//     //   }),
//     // });
//     return true;
//   }
// }

// ── Provider Factory ───────────────────────────────────────────

function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER || 'console';

  switch (provider) {
    case 'console':
      return new ConsoleSmsProvider();
    // case 'twilio':
    //   return new TwilioSmsProvider();
    // case 'msg91':
    //   return new MSG91SmsProvider();
    default:
      logger.warn(`Unknown SMS provider "${provider}", falling back to console`);
      return new ConsoleSmsProvider();
  }
}

/** Singleton SMS provider instance */
export const smsProvider = getSmsProvider();

// ── OTP Generation ─────────────────────────────────────────────

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt for uniform distribution (not Math.random).
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * OTP expiry duration in minutes.
 */
export const OTP_EXPIRY_MINUTES = 5;

/**
 * Max OTP send requests per phone per window.
 */
export const OTP_SEND_LIMIT = 3;

/**
 * OTP send rate limit window in milliseconds (10 minutes).
 */
export const OTP_SEND_WINDOW_MS = 10 * 60 * 1000;
