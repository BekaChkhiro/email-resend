/**
 * Zod schemas for Domain-related MCP tools
 */
import { z } from "zod";
import { PaginationSchema, SortOrderSchema } from "./common.js";
// ============================================================================
// Domain List Filters Schema
// ============================================================================
/**
 * Schema for filtering and listing domains
 */
export const DomainListFiltersSchema = z
    .object({
    // Boolean filters
    isActive: z
        .boolean()
        .optional()
        .describe("Filter by active status"),
    warmupEnabled: z
        .boolean()
        .optional()
        .describe("Filter by warmup enabled status"),
    // Search
    search: z
        .string()
        .max(200, "Search query must be 200 characters or less")
        .trim()
        .optional()
        .describe("Search in domain name and from email"),
    // Sorting
    sortBy: z
        .enum(["createdAt", "domain", "fromName", "warmupDay"])
        .default("createdAt")
        .describe("Field to sort by"),
    sortOrder: SortOrderSchema.describe("Sort direction (asc or desc)"),
})
    .merge(PaginationSchema);
// ============================================================================
// Domain Response Schema
// ============================================================================
/**
 * Domain response shape (what we return from the API)
 */
export const DomainResponseSchema = z.object({
    id: z.string().uuid(),
    domain: z.string(),
    fromName: z.string(),
    fromEmail: z.string(),
    isActive: z.boolean(),
    createdAt: z.coerce.date(),
    // Warmup fields
    warmupEnabled: z.boolean(),
    warmupStartedAt: z.coerce.date().nullable(),
    warmupCompletedAt: z.coerce.date().nullable(),
    warmupDay: z.number().int(),
    warmupSentToday: z.number().int(),
    warmupLastSentAt: z.coerce.date().nullable(),
});
/**
 * List response with pagination metadata
 */
export const DomainListResponseSchema = z.object({
    domains: z.array(DomainResponseSchema),
    total: z.number().int().min(0),
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    hasMore: z.boolean(),
});
// ============================================================================
// Validation Helper
// ============================================================================
/**
 * Validate domain list filters and return parsed data or errors
 */
export function validateDomainListFilters(input) {
    const result = DomainListFiltersSchema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    const errors = {};
    for (const issue of result.error.issues) {
        const path = issue.path.join(".") || "_root";
        if (!errors[path]) {
            errors[path] = [];
        }
        errors[path].push(issue.message);
    }
    return { success: false, errors };
}
//# sourceMappingURL=domains.js.map