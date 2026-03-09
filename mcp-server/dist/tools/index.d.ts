/**
 * Tool registry and dispatcher
 *
 * Aggregates all tool definitions and handles routing
 */
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;
/**
 * Register a tool with its handler
 */
export declare function registerTool(definition: Tool, handler: ToolHandler): void;
/**
 * Get all tool definitions
 */
export declare function getToolDefinitions(): Tool[];
/**
 * Handle a tool call
 */
export declare function handleToolCall(name: string, args: Record<string, unknown>): Promise<{
    content: Array<{
        type: "text";
        text: string;
    }>;
    isError?: boolean;
}>;
export {};
//# sourceMappingURL=index.d.ts.map