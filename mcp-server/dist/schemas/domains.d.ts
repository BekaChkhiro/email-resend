/**
 * Zod schemas for Domain-related MCP tools
 */
import { z } from "zod";
/**
 * Schema for filtering and listing domains
 */
export declare const DomainListFiltersSchema: z.ZodObject<{
    isActive: z.ZodOptional<z.ZodBoolean>;
    warmupEnabled: z.ZodOptional<z.ZodBoolean>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodEnum<["createdAt", "domain", "fromName", "warmupDay"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
} & {
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    sortBy: "domain" | "createdAt" | "fromName" | "warmupDay";
    sortOrder: "asc" | "desc";
    search?: string | undefined;
    isActive?: boolean | undefined;
    warmupEnabled?: boolean | undefined;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    search?: string | undefined;
    sortBy?: "domain" | "createdAt" | "fromName" | "warmupDay" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    isActive?: boolean | undefined;
    warmupEnabled?: boolean | undefined;
}>;
export type DomainListFilters = z.infer<typeof DomainListFiltersSchema>;
/**
 * Domain response shape (what we return from the API)
 */
export declare const DomainResponseSchema: z.ZodObject<{
    id: z.ZodString;
    domain: z.ZodString;
    fromName: z.ZodString;
    fromEmail: z.ZodString;
    isActive: z.ZodBoolean;
    createdAt: z.ZodDate;
    warmupEnabled: z.ZodBoolean;
    warmupStartedAt: z.ZodNullable<z.ZodDate>;
    warmupCompletedAt: z.ZodNullable<z.ZodDate>;
    warmupDay: z.ZodNumber;
    warmupSentToday: z.ZodNumber;
    warmupLastSentAt: z.ZodNullable<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    domain: string;
    createdAt: Date;
    isActive: boolean;
    warmupEnabled: boolean;
    fromName: string;
    warmupDay: number;
    fromEmail: string;
    warmupStartedAt: Date | null;
    warmupCompletedAt: Date | null;
    warmupSentToday: number;
    warmupLastSentAt: Date | null;
}, {
    id: string;
    domain: string;
    createdAt: Date;
    isActive: boolean;
    warmupEnabled: boolean;
    fromName: string;
    warmupDay: number;
    fromEmail: string;
    warmupStartedAt: Date | null;
    warmupCompletedAt: Date | null;
    warmupSentToday: number;
    warmupLastSentAt: Date | null;
}>;
export type DomainResponse = z.infer<typeof DomainResponseSchema>;
/**
 * List response with pagination metadata
 */
export declare const DomainListResponseSchema: z.ZodObject<{
    domains: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        domain: z.ZodString;
        fromName: z.ZodString;
        fromEmail: z.ZodString;
        isActive: z.ZodBoolean;
        createdAt: z.ZodDate;
        warmupEnabled: z.ZodBoolean;
        warmupStartedAt: z.ZodNullable<z.ZodDate>;
        warmupCompletedAt: z.ZodNullable<z.ZodDate>;
        warmupDay: z.ZodNumber;
        warmupSentToday: z.ZodNumber;
        warmupLastSentAt: z.ZodNullable<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        domain: string;
        createdAt: Date;
        isActive: boolean;
        warmupEnabled: boolean;
        fromName: string;
        warmupDay: number;
        fromEmail: string;
        warmupStartedAt: Date | null;
        warmupCompletedAt: Date | null;
        warmupSentToday: number;
        warmupLastSentAt: Date | null;
    }, {
        id: string;
        domain: string;
        createdAt: Date;
        isActive: boolean;
        warmupEnabled: boolean;
        fromName: string;
        warmupDay: number;
        fromEmail: string;
        warmupStartedAt: Date | null;
        warmupCompletedAt: Date | null;
        warmupSentToday: number;
        warmupLastSentAt: Date | null;
    }>, "many">;
    total: z.ZodNumber;
    limit: z.ZodNumber;
    offset: z.ZodNumber;
    hasMore: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
    domains: {
        id: string;
        domain: string;
        createdAt: Date;
        isActive: boolean;
        warmupEnabled: boolean;
        fromName: string;
        warmupDay: number;
        fromEmail: string;
        warmupStartedAt: Date | null;
        warmupCompletedAt: Date | null;
        warmupSentToday: number;
        warmupLastSentAt: Date | null;
    }[];
}, {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
    domains: {
        id: string;
        domain: string;
        createdAt: Date;
        isActive: boolean;
        warmupEnabled: boolean;
        fromName: string;
        warmupDay: number;
        fromEmail: string;
        warmupStartedAt: Date | null;
        warmupCompletedAt: Date | null;
        warmupSentToday: number;
        warmupLastSentAt: Date | null;
    }[];
}>;
export type DomainListResponse = z.infer<typeof DomainListResponseSchema>;
/**
 * Validate domain list filters and return parsed data or errors
 */
export declare function validateDomainListFilters(input: unknown): {
    success: boolean;
    data?: DomainListFilters;
    errors?: Record<string, string[]>;
};
//# sourceMappingURL=domains.d.ts.map