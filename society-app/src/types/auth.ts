// ============================================================
// Auth Types - Society Management Platform
// ============================================================

/** User roles in the platform */
export type UserRole = 'resident' | 'guard' | 'admin';

/** Login request payload sent to POST /auth/login */
export interface LoginRequest {
  email: string;
  password: string;
  role: UserRole;
}

/** Successful login response from the server */
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number; // seconds until access token expiry
  };
}

/** User object returned from auth endpoints */
export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: UserRole;
  flatNumber?: string;    // For residents
  building?: string;      // For residents
  gateAssignment?: string; // For guards
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: string;
}

/** Forgot password request payload */
export interface ForgotPasswordRequest {
  email: string;
}

/** Forgot password response */
export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

/** Refresh token request */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** Refresh token response */
export interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    expiresIn: number;
  };
}

/** OTP send request payload */
export interface OtpSendRequest {
  phone: string;
}

/** OTP send response */
export interface OtpSendResponse {
  success: boolean;
  message: string;
  data: {
    expiresInSeconds: number;
    phone: string;
  };
}

/** OTP verify request payload */
export interface OtpVerifyRequest {
  phone: string;
  otp: string;
}

/** Auth state managed in context */
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

/** Auth context methods */
export interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  loginWithOtp: (phone: string, otp: string) => Promise<void>;
  firebaseLogin: (idToken: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
}

/** Form validation error */
export interface ValidationError {
  field: string;
  message: string;
}

/** Session expiry modal props */
export interface SessionExpiryModalProps {
  visible: boolean;
  onReLogin: () => void;
  onLogout: () => void;
}

/** Role selector option */
export interface RoleOption {
  value: UserRole;
  label: string;
  icon: string;
  description: string;
}
