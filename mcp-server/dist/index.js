#!/usr/bin/env node
/**
 * Email Campaign MCP Server - Entry Point
 *
 * Usage:
 *   node dist/index.js --stdio    # Run with stdio transport (for Claude Desktop/Code)
 *   node dist/index.js --http     # Run with HTTP/SSE transport (for web clients)
 *
 * Environment Variables:
 *   DATABASE_URL     - PostgreSQL connection string
 *   MCP_VERBOSE      - Enable verbose logging ("true")
 *   MCP_DEBUG        - Enable debug mode with stack traces ("true")
 *   MCP_HTTP_PORT    - HTTP server port (default: 3100)
 *   MCP_API_KEY      - API key for HTTP authentication
 */
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load environment variables from parent project
config({ path: resolve(__dirname, "../../.env") });
config({ path: resolve(__dirname, "../.env") });
import { parseArgs } from "./utils/args.js";
import { createServer } from "./server.js";
async function main() {
    const args = parseArgs(process.argv.slice(2));
    // Create the MCP server
    const server = createServer();
    if (args.mode === "http") {
        // HTTP/SSE transport for web clients
        const { startHttpTransport } = await import("./transports/http.js");
        await startHttpTransport(server, {
            port: args.port || parseInt(process.env.MCP_HTTP_PORT || "3100"),
            apiKey: process.env.MCP_API_KEY,
        });
    }
    else {
        // stdio transport for Claude Desktop/Code (default)
        const { startStdioTransport } = await import("./transports/stdio.js");
        await startStdioTransport(server, {
            verbose: process.env.MCP_VERBOSE === "true",
            shutdownTimeout: parseInt(process.env.MCP_SHUTDOWN_TIMEOUT || "5000"),
        });
    }
}
main().catch((error) => {
    console.error("[MCP] Failed to start server:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map