/**
 * Zod schemas for template validation
 */
import { z } from "zod";
export declare const TemplateListFiltersSchema: z.ZodObject<{
    campaignId: z.ZodString;
    sortBy: z.ZodDefault<z.ZodEnum<["sortOrder", "versionName", "createdAt"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sortBy: "createdAt" | "sortOrder" | "versionName";
    sortOrder: "asc" | "desc";
    campaignId: string;
}, {
    campaignId: string;
    sortBy?: "createdAt" | "sortOrder" | "versionName" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type TemplateListFilters = z.infer<typeof TemplateListFiltersSchema>;
/**
 * Validate template list filters
 */
export declare function validateTemplateListFilters(input: unknown): {
    success: true;
    data: TemplateListFilters;
} | {
    success: false;
    errors: Record<string, string[]>;
};
export declare const TemplateCreateSchema: z.ZodObject<{
    campaignId: z.ZodString;
    versionName: z.ZodString;
    body: z.ZodString;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
    versionName: string;
    body: string;
    sortOrder?: number | undefined;
}, {
    campaignId: string;
    versionName: string;
    body: string;
    sortOrder?: number | undefined;
}>;
export type TemplateCreate = z.infer<typeof TemplateCreateSchema>;
/**
 * Validate template create input
 */
export declare function validateTemplateCreate(input: unknown): {
    success: true;
    data: TemplateCreate;
} | {
    success: false;
    errors: Record<string, string[]>;
};
export interface TemplateResponse {
    id: string;
    campaignId: string;
    versionName: string;
    body: string;
    sortOrder: number;
}
export interface TemplateListResponse {
    templates: TemplateResponse[];
    total: number;
    campaignId: string;
}
export interface TemplateCreateResponse {
    template: TemplateResponse;
    message: string;
}
//# sourceMappingURL=templates.d.ts.map