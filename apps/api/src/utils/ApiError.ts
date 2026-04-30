export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  static unauthenticated(message = 'Authentication required') {
    return new ApiError('UNAUTHENTICATED', message);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError('FORBIDDEN', message);
  }
  static notFound(resource = 'Resource') {
    return new ApiError('NOT_FOUND', `${resource} not found`);
  }
  static validation(details: unknown, message = 'Invalid request') {
    return new ApiError('VALIDATION_ERROR', message, details);
  }
  static conflict(message = 'Resource conflict') {
    return new ApiError('CONFLICT', message);
  }
}
