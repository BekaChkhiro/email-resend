/**
 * Resource registry and handler
 *
 * Implements MCP resources for quick data access
 */

import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import { NotFoundError } from "../utils/errors.js";

// Resource handler type
type ResourceHandler = () => Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>;

// Resource registry
const resourceHandlers: Map<string, ResourceHandler> = new Map();
const resourceDefinitions: Resource[] = [];

/**
 * Register a resource with its handler
 */
export function registerResource(definition: Resource, handler: ResourceHandler): void {
  resourceDefinitions.push(definition);
  resourceHandlers.set(definition.uri, handler);
}

/**
 * Get all resource definitions
 */
export function getResourceDefinitions(): Resource[] {
  return resourceDefinitions;
}

/**
 * Handle a resource read request
 */
export async function handleResourceRead(
  uri: string
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
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
registerResource(
  {
    uri: "email-campaign://server/info",
    name: "Server Info",
    description: "Information about the MCP server",
    mimeType: "application/json",
  },
  async () => ({
    contents: [
      {
        uri: "email-campaign://server/info",
        mimeType: "application/json",
        text: JSON.stringify(
          {
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
          },
          null,
          2
        ),
      },
    ],
  })
);
