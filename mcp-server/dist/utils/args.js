/**
 * CLI argument parsing utilities
 */
export function parseArgs(args) {
    const result = {
        mode: "stdio",
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case "--stdio":
                result.mode = "stdio";
                break;
            case "--http":
                result.mode = "http";
                break;
            case "--port":
                const portArg = args[++i];
                if (portArg) {
                    result.port = parseInt(portArg, 10);
                }
                break;
            case "-h":
            case "--help":
                result.help = true;
                printHelp();
                process.exit(0);
            default:
                if (arg.startsWith("--port=")) {
                    result.port = parseInt(arg.split("=")[1], 10);
                }
        }
    }
    return result;
}
function printHelp() {
    console.log(`
Email Campaign MCP Server

Usage:
  email-campaign-mcp-server [options]

Options:
  --stdio          Run with stdio transport (default, for Claude Desktop/Code)
  --http           Run with HTTP/SSE transport (for web clients)
  --port <port>    HTTP port (default: 3100, requires --http)
  -h, --help       Show this help message

Environment Variables:
  DATABASE_URL     PostgreSQL connection string
  MCP_MODE         Default mode (stdio or http)
  MCP_HTTP_PORT    HTTP port (default: 3100)
  MCP_API_KEY      API key for HTTP authentication
  MCP_RATE_LIMIT   Rate limit per minute (default: 60)

Examples:
  # Run with stdio (for Claude Desktop)
  email-campaign-mcp-server --stdio

  # Run with HTTP on port 3100
  email-campaign-mcp-server --http --port 3100
`);
}
//# sourceMappingURL=args.js.map