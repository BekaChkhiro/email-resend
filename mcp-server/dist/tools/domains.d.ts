/**
 * Domain management MCP tools
 */
import { type DomainListResponse } from "../schemas/domains.js";
/**
 * List all domains with optional filtering by isActive and warmupEnabled
 */
declare function domainsList(args: Record<string, unknown>): Promise<DomainListResponse>;
export { domainsList };
//# sourceMappingURL=domains.d.ts.map