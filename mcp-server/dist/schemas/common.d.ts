/**
 * Common Zod schemas used across tools
 */
import { z } from "zod";
/**
 * Pagination parameters
 */
export declare const PaginationSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export type Pagination = z.infer<typeof PaginationSchema>;
/**
 * ID parameter
 */
export declare const IdSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type Id = z.infer<typeof IdSchema>;
/**
 * Email validation
 */
export declare const EmailSchema: z.ZodString;
/**
 * Date range filter
 */
export declare const DateRangeSchema: z.ZodObject<{
    from: z.ZodOptional<z.ZodDate>;
    to: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    from?: Date | undefined;
    to?: Date | undefined;
}, {
    from?: Date | undefined;
    to?: Date | undefined;
}>;
export type DateRange = z.infer<typeof DateRangeSchema>;
/**
 * Sort order
 */
export declare const SortOrderSchema: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
export type SortOrder = z.infer<typeof SortOrderSchema>;
/**
 * Status enum for campaigns
 */
export declare const CampaignStatusSchema: z.ZodEnum<["draft", "sending", "paused", "completed"]>;
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
/**
 * Status enum for emails
 */
export declare const EmailStatusSchema: z.ZodEnum<["pending", "sent", "delivered", "opened", "clicked", "bounced", "failed", "unsubscribed"]>;
export type EmailStatus = z.infer<typeof EmailStatusSchema>;
/**
 * Helper to extract Zod validation errors as a readable object
 */
export declare function formatZodErrors(error: z.ZodError): Record<string, string[]>;
//# sourceMappingURL=common.d.ts.map