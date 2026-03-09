/**
 * Database connection utilities for MCP Server
 *
 * Uses PrismaPg adapter for PostgreSQL connection pooling
 * and provides error handling utilities for database operations
 */
export declare const prisma: any;
/**
 * Test database connection
 * @returns Promise<boolean> - true if connection successful, false otherwise
 */
export declare function testConnection(): Promise<boolean>;
/**
 * Get connection pool statistics
 * Useful for monitoring and debugging
 */
export declare function getPoolStats(): {
    total: number;
    idle: number;
    waiting: number;
};
/**
 * Check database health
 * @returns Promise with health status information
 */
export declare function healthCheck(): Promise<{
    connected: boolean;
    latencyMs: number;
    pool: {
        total: number;
        idle: number;
        waiting: number;
    };
    error?: string;
}>;
/**
 * Disconnect from database and close connection pool
 * Should be called during graceful shutdown
 */
export declare function disconnect(): Promise<void>;
/**
 * Wrap database operations with error handling
 * Automatically catches and transforms Prisma errors into DatabaseError
 *
 * @param operation - Async function that performs database operations
 * @returns Promise with the result of the operation
 * @throws DatabaseError with appropriate message for known error types
 *
 * @example
 * const contact = await withDb(async () => {
 *   return prisma.contact.findUnique({ where: { id } });
 * });
 */
export declare function withDb<T>(operation: () => Promise<T>): Promise<T>;
/**
 * Execute a database operation with retry logic
 * Useful for transient connection errors
 *
 * @param operation - Async function that performs database operations
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 1000)
 * @returns Promise with the result of the operation
 */
export declare function withRetry<T>(operation: () => Promise<T>, maxRetries?: number, delayMs?: number): Promise<T>;
export default prisma;
//# sourceMappingURL=db.d.ts.map