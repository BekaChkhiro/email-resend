/**
 * Error handling utilities for MCP Server
 */
export declare enum McpErrorCode {
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603,
    NotFound = -32001,
    ValidationError = -32002,
    DatabaseError = -32003,
    AuthenticationError = -32004,
    RateLimitExceeded = -32005,
    ConflictError = -32006
}
export declare class ToolError extends Error {
    readonly code: McpErrorCode;
    readonly data?: unknown;
    constructor(message: string, code?: McpErrorCode, data?: unknown);
    toResponse(): {
        content: {
            type: "text";
            text: string;
        }[];
        isError: boolean;
    };
}
export declare class NotFoundError extends ToolError {
    constructor(resource: string, id: string);
}
export declare class ValidationError extends ToolError {
    constructor(message: string, errors?: Record<string, string[]>);
}
export declare class DatabaseError extends ToolError {
    constructor(message: string, originalError?: unknown);
}
export declare class AuthenticationError extends ToolError {
    constructor(message?: string);
}
export declare class RateLimitError extends ToolError {
    constructor(retryAfter?: number);
}
export declare class ConflictError extends ToolError {
    constructor(message: string, conflictingField?: string);
}
/**
 * Format error for MCP response
 */
export declare function formatErrorResponse(error: unknown): {
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
};
/**
 * Format success response
 */
export declare function formatSuccessResponse(data: unknown): {
    content: {
        type: "text";
        text: string;
    }[];
};
//# sourceMappingURL=errors.d.ts.map