// ============================================================
// OTP Validation Schemas — Zod request validation
// ============================================================

import { z } from 'zod';

/**
 * Schema for POST /api/v1/auth/otp/send
 * Requires a valid 10-digit Indian phone number.
 */
export const otpSendSchema = z.object({
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
});

export type OtpSendInput = z.infer<typeof otpSendSchema>;

/**
 * Schema for POST /api/v1/auth/otp/verify
 * Requires phone + 6-digit OTP.
 */
export const otpVerifySchema = z.object({
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  otp: z
    .string()
    .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
