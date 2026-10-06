// ============================================================
// Custom Error Classes — Typed API errors
// ============================================================
// Each error maps to a specific HTTP status code and error code
// from the Jira ticket's Failure Cases section.
// ============================================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Expected errors (not bugs)
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** 401 — Invalid email/phone or password */
export class InvalidCredentialsError extends AppError {
  constructor() {
    // Generic message to prevent user enumeration
    super('Invalid credentials. Please check your email/phone and password.', 401, 'INVALID_CREDENTIALS');
  }
}

/** 403 — User account is inactive/disabled */
export class UserInactiveError extends AppError {
  constructor() {
    super('Your account is inactive. Please contact your society administrator.', 403, 'USER_INACTIVE');
  }
}

/** 422 — Request validation failed */
export class ValidationError extends AppError {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed. Please check your input.', 422, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/** 429 — Too many login attempts */
export class TooManyRequestsError extends AppError {
  constructor() {
    super('Too many login attempts. Please try again later.', 429, 'TOO_MANY_REQUESTS');
  }
}

/** 500 — Unexpected server error */
export class InternalError extends AppError {
  constructor(message: string = 'An unexpected error occurred. Please try again.') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}
