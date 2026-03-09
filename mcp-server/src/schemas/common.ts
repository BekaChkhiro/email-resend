/**
 * Common Zod schemas used across tools
 */

import { z } from "zod";

/**
 * Pagination parameters
 */
export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * ID parameter
 */
export const IdSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

export type Id = z.infer<typeof IdSchema>;

/**
 * Email validation
 */
export const EmailSchema = z.string().email("Invalid email format").toLowerCase();

/**
 * Date range filter
 */
export const DateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type DateRange = z.infer<typeof DateRangeSchema>;

/**
 * Sort order
 */
export const SortOrderSchema = z.enum(["asc", "desc"]).default("desc");

export type SortOrder = z.infer<typeof SortOrderSchema>;

/**
 * Status enum for campaigns
 */
export const CampaignStatusSchema = z.enum(["draft", "sending", "paused", "completed"]);

export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

/**
 * Status enum for emails
 */
export const EmailStatusSchema = z.enum([
  "pending",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "failed",
  "unsubscribed",
]);

export type EmailStatus = z.infer<typeof EmailStatusSchema>;

/**
 * Helper to extract Zod validation errors as a readable object
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return errors;
}
