/**
 * Database connection utilities for MCP Server
 *
 * Uses PrismaPg adapter for PostgreSQL connection pooling
 * and provides error handling utilities for database operations
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { DatabaseError } from "./errors.js";
// Connection pool configuration
const POOL_CONFIG = {
    // Maximum number of connections in the pool
    max: process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX, 10) : 10,
    // Minimum number of connections in the pool
    min: process.env.DATABASE_POOL_MIN ? parseInt(process.env.DATABASE_POOL_MIN, 10) : 2,
    // Connection timeout in milliseconds
    connectionTimeoutMillis: process.env.DATABASE_CONNECTION_TIMEOUT
        ? parseInt(process.env.DATABASE_CONNECTION_TIMEOUT, 10)
        : 10000,
    // Idle timeout in milliseconds
    idleTimeoutMillis: process.env.DATABASE_IDLE_TIMEOUT
        ? parseInt(process.env.DATABASE_IDLE_TIMEOUT, 10)
        : 30000,
};
// Global state to prevent multiple connections in development
const globalForPrisma = globalThis;
/**
 * Create a new PostgreSQL connection pool
 */
function createPool() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is not set");
    }
    return new pg.Pool({
        connectionString,
        ...POOL_CONFIG,
    });
}
/**
 * Create a new PrismaClient instance with PrismaPg adapter
 */
function createPrismaClient(pool) {
    const adapter = new PrismaPg(pool);
    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development"
            ? ["query", "error", "warn"]
            : ["error"],
    });
}
/**
 * Get or create the global connection pool
 */
function getPool() {
    if (!globalForPrisma.pool) {
        globalForPrisma.pool = createPool();
    }
    return globalForPrisma.pool;
}
/**
 * Get or create the global Prisma client
 */
function getPrismaClient() {
    if (!globalForPrisma.prisma) {
        const pool = getPool();
        globalForPrisma.prisma = createPrismaClient(pool);
    }
    return globalForPrisma.prisma;
}
// Export the singleton Prisma client
export const prisma = getPrismaClient();
/**
 * Test database connection
 * @returns Promise<boolean> - true if connection successful, false otherwise
 */
export async function testConnection() {
    try {
        await prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error("Database connection failed:", error);
        return false;
    }
}
/**
 * Get connection pool statistics
 * Useful for monitoring and debugging
 */
export function getPoolStats() {
    const pool = getPool();
    return {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
    };
}
/**
 * Check database health
 * @returns Promise with health status information
 */
export async function healthCheck() {
    const startTime = Date.now();
    try {
        await prisma.$queryRaw `SELECT 1`;
        const latencyMs = Date.now() - startTime;
        return {
            connected: true,
            latencyMs,
            pool: getPoolStats(),
        };
    }
    catch (error) {
        const latencyMs = Date.now() - startTime;
        return {
            connected: false,
            latencyMs,
            pool: getPoolStats(),
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Disconnect from database and close connection pool
 * Should be called during graceful shutdown
 */
export async function disconnect() {
    try {
        if (globalForPrisma.prisma) {
            await globalForPrisma.prisma.$disconnect();
            globalForPrisma.prisma = undefined;
        }
        if (globalForPrisma.pool) {
            await globalForPrisma.pool.end();
            globalForPrisma.pool = undefined;
        }
    }
    catch (error) {
        console.error("Error during database disconnect:", error);
        throw error;
    }
}
/**
 * Prisma error codes for common database errors
 */
const PRISMA_ERROR_CODES = {
    P2002: "Unique constraint violation",
    P2003: "Foreign key constraint violation",
    P2025: "Record not found",
    P2014: "The change you are trying to make would violate the required relation",
    P2016: "Query interpretation error",
    P2021: "The table does not exist in the current database",
    P2022: "The column does not exist in the current database",
    P2024: "Timed out fetching a new connection from the pool",
};
/**
 * Extract Prisma error code from error message
 */
function extractPrismaErrorCode(error) {
    const match = error.message.match(/P\d{4}/);
    return match ? match[0] : null;
}
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
export async function withDb(operation) {
    try {
        return await operation();
    }
    catch (error) {
        if (error instanceof Error) {
            const errorCode = extractPrismaErrorCode(error);
            if (errorCode && errorCode in PRISMA_ERROR_CODES) {
                const message = PRISMA_ERROR_CODES[errorCode];
                throw new DatabaseError(message, error);
            }
            // Handle connection errors
            if (error.message.includes("connect") ||
                error.message.includes("ECONNREFUSED") ||
                error.message.includes("timeout")) {
                throw new DatabaseError("Database connection error", error);
            }
        }
        throw new DatabaseError("Database operation failed", error);
    }
}
/**
 * Execute a database operation with retry logic
 * Useful for transient connection errors
 *
 * @param operation - Async function that performs database operations
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 1000)
 * @returns Promise with the result of the operation
 */
export async function withRetry(operation, maxRetries = 3, delayMs = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            // Only retry on connection errors
            const isConnectionError = lastError.message.includes("connect") ||
                lastError.message.includes("ECONNREFUSED") ||
                lastError.message.includes("timeout") ||
                lastError.message.includes("P2024"); // Pool timeout
            if (!isConnectionError || attempt === maxRetries) {
                throw error;
            }
            console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    throw lastError;
}
export default prisma;
//# sourceMappingURL=db.js.map