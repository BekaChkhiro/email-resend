/**
 * Resource registry and handler
 *
 * Implements MCP resources for quick data access
 */
import type { Resource } from "@modelcontextprotocol/sdk/types.js";
type ResourceHandler = () => Promise<{
    contents: Array<{
        uri: string;
        mimeType: string;
        text: string;
    }>;
}>;
/**
 * Register a resource with its handler
 */
export declare function registerResource(definition: Resource, handler: ResourceHandler): void;
/**
 * Get all resource definitions
 */
export declare function getResourceDefinitions(): Resource[];
/**
 * Handle a resource read request
 */
export declare function handleResourceRead(uri: string): Promise<{
    contents: Array<{
        uri: string;
        mimeType: string;
        text: string;
    }>;
}>;
export {};
//# sourceMappingURL=index.d.ts.map