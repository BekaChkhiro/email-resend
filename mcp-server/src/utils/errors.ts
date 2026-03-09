/**
 * Error handling utilities for MCP Server
 */

export enum McpErrorCode {
  // Standard MCP errors
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,

  // Custom application errors
  NotFound = -32001,
  ValidationError = -32002,
  DatabaseError = -32003,
  AuthenticationError = -32004,
  RateLimitExceeded = -32005,
  ConflictError = -32006,
}

export class ToolError extends Error {
  public readonly code: McpErrorCode;
  public readonly data?: unknown;

  constructor(message: string, code: McpErrorCode = McpErrorCode.InternalError, data?: unknown) {
    super(message);
    this.name = "ToolError";
    this.code = code;
    this.data = data;
  }

  toResponse() {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: true,
            code: this.code,
            message: this.message,
            data: this.data,
          }),
        },
      ],
      isError: true,
    };
  }
}

export class NotFoundError extends ToolError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, McpErrorCode.NotFound, { resource, id });
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ToolError {
  constructor(message: string, errors?: Record<string, string[]>) {
    super(message, McpErrorCode.ValidationError, { errors });
    this.name = "ValidationError";
  }
}

export class DatabaseError extends ToolError {
  constructor(message: string, originalError?: unknown) {
    super(message, McpErrorCode.DatabaseError, {
      originalError: originalError instanceof Error ? originalError.message : String(originalError),
    });
    this.name = "DatabaseError";
  }
}

export class AuthenticationError extends ToolError {
  constructor(message = "Authentication required") {
    super(message, McpErrorCode.AuthenticationError);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends ToolError {
  constructor(retryAfter?: number) {
    super("Rate limit exceeded", McpErrorCode.RateLimitExceeded, { retryAfter });
    this.name = "RateLimitError";
  }
}

export class ConflictError extends ToolError {
  constructor(message: string, conflictingField?: string) {
    super(message, McpErrorCode.ConflictError, { conflictingField });
    this.name = "ConflictError";
  }
}

/**
 * Format error for MCP response
 */
export function formatErrorResponse(error: unknown) {
  if (error instanceof ToolError) {
    return error.toResponse();
  }

  const message = error instanceof Error ? error.message : String(error);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          error: true,
          code: McpErrorCode.InternalError,
          message,
        }),
      },
    ],
    isError: true,
  };
}

/**
 * Format success response
 */
export function formatSuccessResponse(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}
