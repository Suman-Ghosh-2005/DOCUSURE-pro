export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, code: string = 'INTERNAL_ERROR', statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function handleApiError(error: unknown) {
  console.error('[DOCUSURE API Error]:', error);

  if (error instanceof AppError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
      status: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      error: {
        message: error.message,
        code: 'UNHANDLED_ERROR',
      },
      status: 500,
    };
  }

  return {
    error: {
      message: 'An unexpected error occurred.',
      code: 'UNKNOWN_ERROR',
    },
    status: 500,
  };
}
