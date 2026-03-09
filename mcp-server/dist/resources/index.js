/**
 * Resource registry and handler
 *
 * Implements MCP resources for quick data access
 */
import { NotFoundError } from "../utils/errors.js";
// Resource registry
const resourceHandlers = new Map();
const resourceDefinitions = [];
/**
 * Register a resource with its handler
 */
export function registerResource(definition, handler) {
    resourceDefinitions.push(definition);
    resourceHandlers.set(definition.uri, handler);
}
/**
 * Get all resource definitions
 */
export function getResourceDefinitions() {
    return resourceDefinitions;
}
/**
 * Handle a resource read request
 */
export async function handleResourceRead(uri) {
    const handler = resourceHandlers.get(uri);
    if (!handler) {
        throw new NotFoundError("Resource", uri);
    }
    return handler();
}
// Import and register resources (will be populated as resources are implemented)
// import "./contacts.js";
// import "./campaigns.js";
// import "./domains.js";
// import "./inbox.js";
// import "./analytics.js";
// Placeholder resources - to be implemented
registerResource({
    uri: "email-campaign://server/info",
    name: "Server Info",
    description: "Information about the MCP server",
    mimeType: "application/json",
}, async () => ({
    contents: [
        {
            uri: "email-campaign://server/info",
            mimeType: "application/json",
            text: JSON.stringify({
                name: "email-campaign-mcp-server",
                version: "1.0.0",
                status: "running",
                resources: [
                    "email-campaign://contacts/all",
                    "email-campaign://campaigns/active",
                    "email-campaign://domains/warmup",
                    "email-campaign://inbox/unread",
                    "email-campaign://analytics/today",
                ],
            }, null, 2),
        },
    ],
}));
//# sourceMappingURL=index.js.map