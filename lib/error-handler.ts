export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  DB_ERROR: "DB_ERROR",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export function handleApiError(error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error("API Error:", error);
  }

  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
      status: error.status,
    };
  }

  if (error && typeof error === "object" && "issues" in error) {
    return {
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "Validación fallida",
        details: (error as { issues: unknown[] }).issues,
      },
      status: 422,
    };
  }

  return {
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: "Error interno del servidor",
    },
    status: 500,
  };
}
