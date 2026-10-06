// ============================================================
// Auth API Service - Society Management Platform
// ============================================================
// Handles all authentication API calls.
// ============================================================

import { API_BASE_URL, AUTH_ENDPOINTS } from '../constants';
import {
  LoginRequest,
  LoginResponse,
  ForgotPasswordResponse,
  RefreshTokenResponse,
  OtpSendResponse,
} from '../types/auth';

// ── Auth Service ───────────────────────────────────────────────

export const authService = {
  /**
   * Login with email/phone, password and role.
   * POST /auth/login
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.LOGIN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        message: data?.error?.message || 'Login failed. Please try again.',
        code: data?.error?.code || 'LOGIN_ERROR',
        details: data?.error?.details,
      };
    }

    // Ensure we check for role mismatch if the API didn't handle it
    // Our API currently does not check for role mismatch on login payload vs DB role 
    // unless we enforce it in backend. We'll enforce it here or handle appropriately.
    if (data.data.user.role !== credentials.role) {
      throw {
        status: 403,
        message: `This account is not registered as ${credentials.role}. Please select the correct role.`,
        code: 'ROLE_MISMATCH',
      };
    }

    return data;
  },

  /**
   * Logout and invalidate session.
   * POST /auth/logout
   */
  async logout(accessToken: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.LOGOUT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      // We don't throw on logout failure since we want to clear local state anyway
    } catch (e) {
      console.warn('[Auth] Logout API call failed', e);
    }
  },

  /**
   * Request password reset email.
   * POST /auth/forgot-password
   */
  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.FORGOT_PASSWORD}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        message: data?.error?.message || 'Failed to request password reset.',
        code: data?.error?.code || 'FORGOT_PASSWORD_ERROR',
      };
    }

    return data;
  },

  /**
   * Refresh access token using refresh token.
   * POST /auth/refresh-token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.REFRESH_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        message: data?.error?.message || 'Session expired. Please login again.',
        code: data?.error?.code || 'REFRESH_ERROR',
      };
    }

    return data;
  },

  /**
   * Send OTP to a phone number.
   * POST /auth/otp/send
   */
  async sendOtp(phone: string): Promise<OtpSendResponse> {
    const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.OTP_SEND}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        message: data?.error?.message || 'Failed to send OTP. Please try again.',
        code: data?.error?.code || 'OTP_SEND_ERROR',
      };
    }

    return data;
  },

  /**
   * Verify OTP and login.
   * POST /auth/otp/verify
   */
  async verifyOtp(phone: string, otp: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.OTP_VERIFY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, otp }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        message: data?.error?.message || 'OTP verification failed.',
        code: data?.error?.code || 'OTP_VERIFY_ERROR',
      };
    }

    return data;
  },

  /**
   * Login using Firebase ID Token
   * POST /auth/firebase-login
   */
  async firebaseLogin(idToken: string, role: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.FIREBASE_LOGIN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        message: data?.error?.message || 'Firebase login failed.',
        code: data?.error?.code || 'FIREBASE_LOGIN_ERROR',
        details: data?.error?.details,
      };
    }

    if (data.data.user.role !== role) {
      throw {
        status: 403,
        message: `This account is not registered as ${role}. Please select the correct role.`,
        code: 'ROLE_MISMATCH',
      };
    }

    return data;
  },
};
