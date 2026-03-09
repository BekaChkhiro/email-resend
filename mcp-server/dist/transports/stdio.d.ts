/**
 * stdio Transport for MCP Server
 *
 * Handles stdin/stdout communication for Claude Desktop/Code integration.
 * Implements JSON-RPC message parsing via the MCP SDK's StdioServerTransport.
 */
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
export declare function startStdioTransport(server: Server, options?: StdioTransportOptions): Promise<void>;
/**
 * Get the current connection state.
 * Useful for health checks and debugging.
 */
export declare function getConnectionState(): ConnectionState;
//# sourceMappingURL=stdio.d.ts.map