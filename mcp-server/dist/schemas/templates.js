/**
 * Zod schemas for template validation
 */
import { z } from "zod";
// ============================================================================
// Template List Filters Schema
// ============================================================================
export const TemplateListFiltersSchema = z.object({
    campaignId: z.string().uuid().describe("Campaign ID to get templates for (required)"),
    sortBy: z.enum(["sortOrder", "versionName", "createdAt"]).default("sortOrder").describe("Field to sort by"),
    sortOrder: z.enum(["asc", "desc"]).default("asc").describe("Sort direction"),
});
/**
 * Validate template list filters
 */
export function validateTemplateListFilters(input) {
    const result = TemplateListFiltersSchema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    // Convert Zod errors to our error format
    const errors = {};
    for (const error of result.error.errors) {
        const path = error.path.join(".") || "root";
        if (!errors[path]) {
            errors[path] = [];
        }
        errors[path].push(error.message);
    }
    return { success: false, errors };
}
// ============================================================================
// Template Create Schema
// ============================================================================
export const TemplateCreateSchema = z.object({
    campaignId: z.string().uuid().describe("Campaign ID to create template for (required)"),
    versionName: z
        .string()
        .min(1, "Version name is required")
        .max(100, "Version name must be 100 characters or less")
        .describe("Template version name (e.g., 'Version A', 'Professional', 'Casual')"),
    body: z
        .string()
        .min(1, "Template body is required")
        .describe("Email body content (HTML or plain text). Supports variables: {{firstName}}, {{lastName}}, {{companyName}}, {{email}}"),
    sortOrder: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Sort order for template rotation (auto-assigned if not provided)"),
});
/**
 * Validate template create input
 */
export function validateTemplateCreate(input) {
    const result = TemplateCreateSchema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    // Convert Zod errors to our error format
    const errors = {};
    for (const error of result.error.errors) {
        const path = error.path.join(".") || "root";
        if (!errors[path]) {
            errors[path] = [];
        }
        errors[path].push(error.message);
    }
    return { success: false, errors };
}
//# sourceMappingURL=templates.js.map