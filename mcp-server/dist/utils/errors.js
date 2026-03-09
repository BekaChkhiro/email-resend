/**
 * Error handling utilities for MCP Server
 */
export var McpErrorCode;
(function (McpErrorCode) {
    // Standard MCP errors
    McpErrorCode[McpErrorCode["ParseError"] = -32700] = "ParseError";
    McpErrorCode[McpErrorCode["InvalidRequest"] = -32600] = "InvalidRequest";
    McpErrorCode[McpErrorCode["MethodNotFound"] = -32601] = "MethodNotFound";
    McpErrorCode[McpErrorCode["InvalidParams"] = -32602] = "InvalidParams";
    McpErrorCode[McpErrorCode["InternalError"] = -32603] = "InternalError";
    // Custom application errors
    McpErrorCode[McpErrorCode["NotFound"] = -32001] = "NotFound";
    McpErrorCode[McpErrorCode["ValidationError"] = -32002] = "ValidationError";
    McpErrorCode[McpErrorCode["DatabaseError"] = -32003] = "DatabaseError";
    McpErrorCode[McpErrorCode["AuthenticationError"] = -32004] = "AuthenticationError";
    McpErrorCode[McpErrorCode["RateLimitExceeded"] = -32005] = "RateLimitExceeded";
    McpErrorCode[McpErrorCode["ConflictError"] = -32006] = "ConflictError";
})(McpErrorCode || (McpErrorCode = {}));
export class ToolError extends Error {
    code;
    data;
    constructor(message, code = McpErrorCode.InternalError, data) {
        super(message);
        this.name = "ToolError";
        this.code = code;
        this.data = data;
    }
    toResponse() {
        return {
            content: [
                {
                    type: "text",
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
    constructor(resource, id) {
        super(`${resource} with id '${id}' not found`, McpErrorCode.NotFound, { resource, id });
        this.name = "NotFoundError";
    }
}
export class ValidationError extends ToolError {
    constructor(message, errors) {
        super(message, McpErrorCode.ValidationError, { errors });
        this.name = "ValidationError";
    }
}
export class DatabaseError extends ToolError {
    constructor(message, originalError) {
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
    constructor(retryAfter) {
        super("Rate limit exceeded", McpErrorCode.RateLimitExceeded, { retryAfter });
        this.name = "RateLimitError";
    }
}
export class ConflictError extends ToolError {
    constructor(message, conflictingField) {
        super(message, McpErrorCode.ConflictError, { conflictingField });
        this.name = "ConflictError";
    }
}
/**
 * Format error for MCP response
 */
export function formatErrorResponse(error) {
    if (error instanceof ToolError) {
        return error.toResponse();
    }
    const message = error instanceof Error ? error.message : String(error);
    return {
        content: [
            {
                type: "text",
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
export function formatSuccessResponse(data) {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(data, null, 2),
            },
        ],
    };
}
//# sourceMappingURL=errors.js.map