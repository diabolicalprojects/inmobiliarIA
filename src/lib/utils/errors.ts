import { NextResponse } from "next/server";
import { logger } from "./logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * Wraps an async API route handler with error handling.
 */
export function withErrorHandling(
  handler: (req: Request, context?: unknown) => Promise<NextResponse>
) {
  return async (req: Request, context?: unknown) => {
    try {
      return await handler(req, context);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn(error.message, "API", {
          statusCode: error.statusCode,
          path: new URL(req.url).pathname,
        });

        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }

      logger.error(
        error instanceof Error ? error.message : "Unknown error",
        "API",
        {
          path: new URL(req.url).pathname,
          stack: error instanceof Error ? error.stack : undefined,
        }
      );

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
