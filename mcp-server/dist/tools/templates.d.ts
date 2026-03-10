/**
 * Template management MCP tools
 */
import { type TemplateListResponse, type TemplateCreateResponse } from "../schemas/templates.js";
/**
 * List templates for a campaign, ordered by sortOrder
 */
declare function templatesList(args: Record<string, unknown>): Promise<TemplateListResponse>;
/**
 * Create a new template for a campaign
 */
declare function templatesCreate(args: Record<string, unknown>): Promise<TemplateCreateResponse>;
export { templatesList, templatesCreate };
//# sourceMappingURL=templates.d.ts.map