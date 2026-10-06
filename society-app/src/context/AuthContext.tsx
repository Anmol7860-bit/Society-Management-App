// ============================================================
// Auth Context - Society Management Platform
// ============================================================
// Provides authentication state and methods to the entire app.
// Handles JWT token storage, session validation, auto-refresh,
// and session expiry detection.
// ============================================================

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import * as Storage from '../utils/storage';
import {
  AuthState,
  AuthContextType,
  LoginRequest,
  User,
} from '../types/auth';
import { authService } from '../services/authService';
import { STORAGE_KEYS, SESSION_CHECK_INTERVAL } from '../constants';

// ── State Management ───────────────────────────────────────────

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; accessToken: string; refreshToken: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'REFRESH_TOKEN'; payload: { accessToken: string } }
  | { type: 'RESTORE_SESSION'; payload: { user: User; accessToken: string; refreshToken: string } };

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true, // Start as loading to check stored session
  isAuthenticated: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'REFRESH_TOKEN':
      return { ...state, accessToken: action.payload.accessToken };
    case 'RESTORE_SESSION':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      };
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Secure Storage Helpers ──────────────────────────────────

  const saveTokens = async (accessToken: string, refreshToken: string, user: User) => {
    try {
      await Promise.all([
        Storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        Storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
        Storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user)),
      ]);
    } catch (e) {
      console.error('[Auth] Failed to save tokens:', e);
    }
  };

  const clearTokens = async () => {
    try {
      await Promise.all([
        Storage.deleteItem(STORAGE_KEYS.ACCESS_TOKEN),
        Storage.deleteItem(STORAGE_KEYS.REFRESH_TOKEN),
        Storage.deleteItem(STORAGE_KEYS.USER_DATA),
      ]);
    } catch (e) {
      console.error('[Auth] Failed to clear tokens:', e);
    }
  };

  const getStoredSession = async () => {
    try {
      const [accessToken, refreshToken, userData] = await Promise.all([
        Storage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        Storage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        Storage.getItem(STORAGE_KEYS.USER_DATA),
      ]);

      if (accessToken && refreshToken && userData) {
        return {
          accessToken,
          refreshToken,
          user: JSON.parse(userData) as User,
        };
      }
    } catch (e) {
      console.error('[Auth] Failed to restore session:', e);
    }
    return null;
  };

  // ── Auth Actions ────────────────────────────────────────────

  const login = useCallback(async (credentials: LoginRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.login(credentials);
      const { user, accessToken, refreshToken } = response.data;

      await saveTokens(accessToken, refreshToken, user);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, accessToken, refreshToken },
      });
    } catch (error: any) {
      const message = error?.message || 'Login failed. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  const loginWithOtp = useCallback(async (phone: string, otp: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.verifyOtp(phone, otp);
      const { user, accessToken, refreshToken } = response.data;

      await saveTokens(accessToken, refreshToken, user);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, accessToken, refreshToken },
      });
    } catch (error: any) {
      const message = error?.message || 'OTP verification failed. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  const firebaseLogin = useCallback(async (idToken: string, role: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.firebaseLogin(idToken, role);
      const { user, accessToken, refreshToken } = response.data;

      await saveTokens(accessToken, refreshToken, user);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, accessToken, refreshToken },
      });
    } catch (error: any) {
      const message = error?.message || 'Firebase login failed. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (state.accessToken) {
        await authService.logout(state.accessToken);
      }
    } catch (e) {
      console.error('[Auth] Logout API error:', e);
    } finally {
      await clearTokens();
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      dispatch({ type: 'LOGOUT' });
    }
  }, [state.accessToken]);

  const forgotPassword = useCallback(async (email: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await authService.forgotPassword(email);
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error: any) {
      const message = error?.message || 'Failed to send reset link.';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const refreshSession = useCallback(async () => {
    if (!state.refreshToken) return;
    try {
      const response = await authService.refreshToken(state.refreshToken);
      const { accessToken } = response.data;

      await Storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      dispatch({ type: 'REFRESH_TOKEN', payload: { accessToken } });
    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);
      // Session expired - force logout
      await clearTokens();
      dispatch({ type: 'LOGOUT' });
    }
  }, [state.refreshToken]);

  // ── Session Restoration on App Start ────────────────────────

  useEffect(() => {
    const restoreSession = async () => {
      const stored = await getStoredSession();
      if (stored) {
        dispatch({
          type: 'RESTORE_SESSION',
          payload: stored,
        });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    restoreSession();
  }, []);

  // ── Session Check Timer ─────────────────────────────────────

  useEffect(() => {
    if (state.isAuthenticated && state.refreshToken) {
      sessionTimerRef.current = setInterval(() => {
        refreshSession();
      }, SESSION_CHECK_INTERVAL);

      return () => {
        if (sessionTimerRef.current) {
          clearInterval(sessionTimerRef.current);
        }
      };
    }
  }, [state.isAuthenticated, state.refreshToken, refreshSession]);

  // ── Context Value ───────────────────────────────────────────

  const contextValue: AuthContextType = {
    ...state,
    login,
    loginWithOtp,
    firebaseLogin,
    logout,
    forgotPassword,
    clearError,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context. Must be used within AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
