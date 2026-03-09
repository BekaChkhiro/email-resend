/**
 * HTTP/SSE Transport for MCP Server
 *
 * Provides HTTP API with Server-Sent Events for web clients
 * This is a placeholder - full implementation in T13.1
 */
/**
 * Start the server with HTTP transport
 *
 * TODO: Full implementation in T13.1
 */
export async function startHttpTransport(_server, options) {
    console.error(`[MCP] HTTP transport not yet implemented`);
    console.error(`[MCP] Would listen on port ${options.port}`);
    console.error(`[MCP] Use --stdio for now`);
    // Placeholder - will be implemented in T13.1
    // For now, just keep the process alive
    await new Promise(() => {
        // Keep process running
    });
}
//# sourceMappingURL=http.js.map