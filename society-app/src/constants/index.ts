// ============================================================
// Constants - Society Management Platform
// ============================================================

import { RoleOption } from '../types/auth';

/** API base URL - replace with your actual backend URL */
export const API_BASE_URL = 'http://localhost:3000/api/v1';

/** Auth endpoints */
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh-token',
  FORGOT_PASSWORD: '/auth/forgot-password',
  OTP_SEND: '/auth/otp/send',
  OTP_VERIFY: '/auth/otp/verify',
  FIREBASE_LOGIN: '/auth/firebase-login',
} as const;

/** Secure storage keys */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gk_access_token',
  REFRESH_TOKEN: 'gk_refresh_token',
  USER_DATA: 'gk_user_data',
  SELECTED_ROLE: 'gk_selected_role',
} as const;

/** Token refresh threshold - refresh token 5 minutes before expiry */
export const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in ms

/** Session check interval - check session every 1 minute */
export const SESSION_CHECK_INTERVAL = 60 * 1000; // 1 minute in ms

/** Role options for the selector */
export const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'resident',
    label: 'Resident',
    icon: 'home',
    description: 'Flat owners & tenants',
  },
  {
    value: 'guard',
    label: 'Guard',
    icon: 'shield-checkmark',
    description: 'Security personnel',
  },
  {
    value: 'admin',
    label: 'Admin',
    icon: 'settings',
    description: 'Society management',
  },
];

/** Password validation rules */
export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 64,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
} as const;

/** Animation durations */
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  SPRING: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
} as const;

/** Color palette for programmatic use */
export const COLORS = {
  navy: {
    700: '#1a2744',
    800: '#111d35',
    900: '#0B1426',
    950: '#070d1a',
  },
  primary: {
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
  },
  accent: {
    purple: '#8B5CF6',
    blue: '#3B82F6',
    cyan: '#06B6D4',
  },
  glass: {
    light: 'rgba(255, 255, 255, 0.08)',
    medium: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(255, 255, 255, 0.15)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#94A3B8',
    muted: '#64748B',
    accent: '#818cf8',
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
} as const;
