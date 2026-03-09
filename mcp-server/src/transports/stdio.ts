/**
 * stdio Transport for MCP Server
 *
 * Handles stdin/stdout communication for Claude Desktop/Code integration.
 * Implements JSON-RPC message parsing via the MCP SDK's StdioServerTransport.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

/** Connection state for the stdio transport */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "closing" | "closed";

/** Options for configuring the stdio transport */
export interface StdioTransportOptions {
  /** Enable verbose logging to stderr (default: false) */
  verbose?: boolean;
  /** Shutdown timeout in milliseconds (default: 5000) */
  shutdownTimeout?: number;
}

/** Logger that writes to stderr to avoid interfering with stdio JSON-RPC */
function log(message: string, verbose = false): void {
  if (verbose || process.env.MCP_VERBOSE === "true") {
    console.error(`[MCP stdio] ${message}`);
  }
}

/** Always log errors regardless of verbose setting */
function logError(message: string, error?: unknown): void {
  console.error(`[MCP stdio] ERROR: ${message}`);
  if (error instanceof Error) {
    console.error(`[MCP stdio]   ${error.message}`);
    if (process.env.MCP_DEBUG === "true" && error.stack) {
      console.error(`[MCP stdio]   ${error.stack}`);
    }
  }
}

/**
 * Start the MCP server with stdio transport.
 *
 * This transport uses stdin for receiving JSON-RPC requests and stdout
 * for sending responses. All logging goes to stderr to avoid interference.
 *
 * The transport handles:
 * - JSON-RPC message parsing (via MCP SDK)
 * - Graceful shutdown on SIGINT/SIGTERM
 * - stdin end/close events
 * - Uncaught exceptions and unhandled rejections
 *
 * @param server - The MCP Server instance to connect
 * @param options - Optional configuration
 */
export async function startStdioTransport(
  server: Server,
  options: StdioTransportOptions = {}
): Promise<void> {
  const { verbose = false, shutdownTimeout = 5000 } = options;

  let connectionState: ConnectionState = "disconnected";
  let isShuttingDown = false;

  // Track connection state changes
  const setState = (state: ConnectionState): void => {
    connectionState = state;
    log(`Connection state: ${state}`, verbose);
  };

  // Graceful shutdown handler
  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      log(`Already shutting down, ignoring ${signal}`, verbose);
      return;
    }

    isShuttingDown = true;
    setState("closing");
    log(`Received ${signal}, initiating graceful shutdown...`, true);

    // Set a timeout for forced shutdown
    const forceExitTimeout = setTimeout(() => {
      logError(`Shutdown timeout (${shutdownTimeout}ms) exceeded, forcing exit`);
      process.exit(1);
    }, shutdownTimeout);

    try {
      await server.close();
      clearTimeout(forceExitTimeout);
      setState("closed");
      log("Server closed successfully", true);
      process.exit(0);
    } catch (error) {
      clearTimeout(forceExitTimeout);
      logError("Error during shutdown", error);
      process.exit(1);
    }
  };

  // Create the stdio transport
  const transport = new StdioServerTransport();

  // Handle graceful shutdown signals
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Handle stdin closing (e.g., parent process terminates)
  process.stdin.on("end", () => {
    log("stdin ended, shutting down", verbose);
    shutdown("stdin-end");
  });

  process.stdin.on("close", () => {
    log("stdin closed", verbose);
    if (connectionState === "connected") {
      shutdown("stdin-close");
    }
  });

  // Handle stdin errors
  process.stdin.on("error", (error) => {
    logError("stdin error", error);
    if (!isShuttingDown) {
      shutdown("stdin-error");
    }
  });

  // Handle stdout errors (e.g., broken pipe)
  process.stdout.on("error", (error) => {
    // EPIPE is expected when the other end closes
    if ((error as NodeJS.ErrnoException).code === "EPIPE") {
      log("stdout pipe broken, shutting down", verbose);
    } else {
      logError("stdout error", error);
    }
    if (!isShuttingDown) {
      shutdown("stdout-error");
    }
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logError("Uncaught exception", error);
    shutdown("uncaughtException").finally(() => process.exit(1));
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason) => {
    logError("Unhandled rejection", reason instanceof Error ? reason : new Error(String(reason)));
    // Don't exit on unhandled rejections, just log
  });

  // Connect server to transport
  setState("connecting");

  try {
    await server.connect(transport);
    setState("connected");
    log("Server running on stdio transport", true);
    log("Ready to receive JSON-RPC messages on stdin", verbose);
  } catch (error) {
    logError("Failed to connect to transport", error);
    throw error;
  }
}

/**
 * Get the current connection state.
 * Useful for health checks and debugging.
 */
export function getConnectionState(): ConnectionState {
  // This would need to be stored in module scope if needed externally
  // For now, it's tracked internally within startStdioTransport
  return "connected"; // Placeholder - actual state is tracked internally
}
