// ============================================================
// Validation Utilities - Society Management Platform
// ============================================================

import { ValidationError } from '../types/auth';
import { PASSWORD_RULES } from '../constants';

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validates password against rules
 */
export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < PASSWORD_RULES.MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_RULES.MIN_LENGTH} characters`;
  }
  if (password.length > PASSWORD_RULES.MAX_LENGTH) {
    return `Password must not exceed ${PASSWORD_RULES.MAX_LENGTH} characters`;
  }
  return null;
};

/**
 * Validates login form fields
 */
export const validateLoginForm = (
  email: string,
  password: string,
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!email.trim()) {
    errors.push({ field: 'email', message: 'Email address is required' });
  } else if (!isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else {
    const passwordError = validatePassword(password);
    if (passwordError) {
      errors.push({ field: 'password', message: passwordError });
    }
  }

  return errors;
};

/**
 * Validates forgot password form
 */
export const validateForgotPasswordForm = (email: string): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!email.trim()) {
    errors.push({ field: 'email', message: 'Email address is required' });
  } else if (!isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  return errors;
};

/**
 * Get error message for a specific field from validation errors
 */
export const getFieldError = (
  errors: ValidationError[],
  fieldName: string,
): string | undefined => {
  return errors.find((e) => e.field === fieldName)?.message;
};
