/**
 * HTTP/SSE Transport for MCP Server
 *
 * Provides HTTP API with Server-Sent Events for web clients
 * This is a placeholder - full implementation in T13.1
 */
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
export interface HttpTransportOptions {
    port: number;
    apiKey?: string;
}
/**
 * Start the server with HTTP transport
 *
 * TODO: Full implementation in T13.1
 */
export declare function startHttpTransport(_server: Server, options: HttpTransportOptions): Promise<void>;
//# sourceMappingURL=http.d.ts.map