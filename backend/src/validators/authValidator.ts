// ============================================================
// Validation Schemas — Zod request validation
// ============================================================
// Zod validates the request body BEFORE it reaches your
// controller. If validation fails, it returns 422 with
// clear field-level error messages.
// ============================================================

import { z } from 'zod';

/**
 * Login request schema.
 * Accepts either email OR phone as the identifier.
 */
export const loginSchema = z.object({
  // Accept email or phone — at least one must be provided
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits')
    .optional(),
  email: z
    .string()
    .email('Please provide a valid email address')
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password must not exceed 64 characters'),
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'Either email or phone number is required',
    path: ['identifier'],
  },
);

/** TypeScript type derived from the schema */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Refresh token request schema.
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * Firebase login request schema.
 */
export const firebaseLoginSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
});

export type FirebaseLoginInput = z.infer<typeof firebaseLoginSchema>;
