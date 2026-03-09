/**
 * Tool registry and dispatcher
 *
 * Aggregates all tool definitions and handles routing
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { formatErrorResponse, formatSuccessResponse } from "../utils/errors.js";

// Tool handler type
type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

// Tool registry
const toolHandlers: Map<string, ToolHandler> = new Map();
const toolDefinitions: Tool[] = [];

/**
 * Register a tool with its handler
 */
export function registerTool(definition: Tool, handler: ToolHandler): void {
  toolDefinitions.push(definition);
  toolHandlers.set(definition.name, handler);
}

/**
 * Get all tool definitions
 */
export function getToolDefinitions(): Tool[] {
  return toolDefinitions;
}

/**
 * Handle a tool call
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const handler = toolHandlers.get(name);

  if (!handler) {
    return formatErrorResponse(new Error(`Unknown tool: ${name}`));
  }

  try {
    const result = await handler(args);
    return formatSuccessResponse(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

// Import and register tools (will be populated as tools are implemented)
// import "./contacts.js";
// import "./campaigns.js";
// import "./templates.js";
// import "./domains.js";
// import "./warmup.js";
// import "./inbox.js";
// import "./analytics.js";

// Placeholder: Register a simple info tool
registerTool(
  {
    name: "server_info",
    description: "Get information about the MCP server",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  async () => ({
    name: "email-campaign-mcp-server",
    version: "1.0.0",
    description: "MCP Server for Email Campaign App",
    tools: [
      "contacts_list",
      "contacts_get",
      "contacts_create",
      "contacts_update",
      "contacts_delete",
      "contacts_bulk_create",
      "campaigns_list",
      "campaigns_get",
      "campaigns_create",
      "campaigns_update",
      "campaigns_delete",
      "campaigns_add_contacts",
      "campaigns_remove_contacts",
      "campaigns_prepare",
      "campaigns_start",
      "campaigns_pause",
      "campaigns_stats",
      "templates_list",
      "templates_create",
      "templates_update",
      "templates_delete",
      "domains_list",
      "domains_get",
      "domains_add",
      "domains_update",
      "domains_delete",
      "domains_toggle_active",
      "warmup_start",
      "warmup_stop",
      "warmup_reset",
      "warmup_status",
      "warmup_overview",
      "inbox_conversations",
      "inbox_messages",
      "inbox_reply",
      "inbox_mark_read",
      "inbox_mark_unread",
      "inbox_archive",
      "inbox_stats",
      "analytics_overview",
      "analytics_campaign_comparison",
    ],
    status: "initializing",
  })
);
