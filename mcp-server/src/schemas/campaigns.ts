/**
 * Zod schemas for Campaign-related MCP tools
 */

import { z } from "zod";
import {
  PaginationSchema,
  SortOrderSchema,
  CampaignStatusSchema,
} from "./common.js";

// ============================================================================
// Field Schemas (reusable building blocks)
// ============================================================================

/**
 * Campaign name with reasonable length limits
 */
const CampaignNameSchema = z
  .string()
  .min(1, "Campaign name is required")
  .max(200, "Campaign name must be 200 characters or less")
  .trim();

/**
 * Email subject line
 */
const SubjectSchema = z
  .string()
  .min(1, "Subject is required")
  .max(500, "Subject must be 500 characters or less")
  .trim();

/**
 * Email format enum
 */
export const EmailFormatSchema = z.enum(["html", "plain_text"]);
export type EmailFormat = z.infer<typeof EmailFormatSchema>;

/**
 * Delay between sends in seconds (0 to 1 hour)
 */
const DelaySecondsSchema = z
  .number()
  .int("Delay must be a whole number")
  .min(0, "Delay cannot be negative")
  .max(3600, "Delay cannot exceed 3600 seconds (1 hour)")
  .default(0);

/**
 * Hour of day (0-23)
 */
const HourSchema = z
  .number()
  .int("Hour must be a whole number")
  .min(0, "Hour must be between 0 and 23")
  .max(23, "Hour must be between 0 and 23");

/**
 * Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * Using ISO standard where Monday = 1, but also supporting 0 = Sunday
 */
const DayOfWeekSchema = z
  .number()
  .int("Day must be a whole number")
  .min(0, "Day must be between 0 (Sunday) and 6 (Saturday)")
  .max(6, "Day must be between 0 (Sunday) and 6 (Saturday)");

/**
 * Array of days for sending
 * Default: Monday through Friday (1-5)
 */
const SendDaysSchema = z
  .array(DayOfWeekSchema)
  .min(1, "At least one send day is required")
  .max(7, "Cannot have more than 7 days")
  .default([1, 2, 3, 4, 5]);

/**
 * Timezone validation
 * Accepts IANA timezone strings (e.g., "America/New_York", "Europe/London")
 */
const TimezoneSchema = z
  .string()
  .min(1, "Timezone is required")
  .max(50, "Timezone must be 50 characters or less")
  .refine(
    (tz) => {
      // Common valid timezone patterns
      const validPatterns = [
        /^[A-Z][a-z]+\/[A-Z][a-z_]+$/,           // America/New_York
        /^[A-Z][a-z]+\/[A-Z][a-z]+\/[A-Z][a-z_]+$/, // America/Argentina/Buenos_Aires
        /^UTC$/i,                                  // UTC
        /^GMT$/i,                                  // GMT
        /^Etc\/[A-Z]+[+-]?\d*$/i,                 // Etc/GMT+5
      ];
      return validPatterns.some((pattern) => pattern.test(tz));
    },
    {
      message:
        "Invalid timezone format. Use IANA timezone (e.g., 'America/New_York', 'Europe/London', 'UTC')",
    }
  );

/**
 * AI prompt for personalized email generation
 */
const AiPromptSchema = z
  .string()
  .max(10000, "AI prompt must be 10000 characters or less")
  .trim()
  .optional()
  .nullable();

/**
 * Array of contact IDs
 */
const ContactIdsSchema = z
  .array(z.string().uuid("Invalid contact ID format"))
  .default([]);

// ============================================================================
// Schedule Schema
// ============================================================================

/**
 * Campaign schedule configuration
 */
export const CampaignScheduleSchema = z
  .object({
    sendStartHour: HourSchema.optional()
      .nullable()
      .describe("Start hour for sending emails (0-23)"),
    sendEndHour: HourSchema.optional()
      .nullable()
      .describe("End hour for sending emails (0-23)"),
    sendDays: SendDaysSchema.describe(
      "Days of week to send (0=Sunday, 1=Monday, ..., 6=Saturday)"
    ),
    timezone: TimezoneSchema.optional()
      .nullable()
      .describe("IANA timezone for scheduling (e.g., 'America/New_York')"),
  })
  .refine(
    (data) => {
      // If both hours are set, start must be before or equal to end
      if (
        data.sendStartHour !== undefined &&
        data.sendStartHour !== null &&
        data.sendEndHour !== undefined &&
        data.sendEndHour !== null
      ) {
        return data.sendStartHour <= data.sendEndHour;
      }
      return true;
    },
    {
      message: "sendStartHour must be less than or equal to sendEndHour",
      path: ["sendStartHour"],
    }
  )
  .refine(
    (data) => {
      // If one hour is set, both should be set
      const startSet = data.sendStartHour !== undefined && data.sendStartHour !== null;
      const endSet = data.sendEndHour !== undefined && data.sendEndHour !== null;
      return startSet === endSet;
    },
    {
      message: "Both sendStartHour and sendEndHour must be set together, or both omitted",
      path: ["sendStartHour"],
    }
  );

export type CampaignSchedule = z.infer<typeof CampaignScheduleSchema>;

// ============================================================================
// Campaign Create Schema
// ============================================================================

/**
 * Schema for creating a new campaign
 * Required: name, subject
 * Optional: emailFormat, delaySeconds, schedule, aiPrompt, selectedContactIds
 */
export const CampaignCreateSchema = z
  .object({
    // Required fields
    name: CampaignNameSchema.describe("Campaign name (required)"),
    subject: SubjectSchema.describe("Email subject line (required)"),

    // Optional fields with defaults
    emailFormat: EmailFormatSchema.default("html").describe(
      "Email format: 'html' or 'plain_text'"
    ),
    delaySeconds: DelaySecondsSchema.describe(
      "Delay between sends in seconds (0-3600)"
    ),

    // Schedule fields (flattened for easier use)
    sendStartHour: HourSchema.optional()
      .nullable()
      .describe("Start hour for sending emails (0-23)"),
    sendEndHour: HourSchema.optional()
      .nullable()
      .describe("End hour for sending emails (0-23)"),
    sendDays: SendDaysSchema.describe(
      "Days of week to send (0=Sunday, 1=Monday, ..., 6=Saturday)"
    ),
    timezone: TimezoneSchema.optional()
      .nullable()
      .describe("IANA timezone for scheduling (e.g., 'America/New_York')"),

    // AI integration
    aiPrompt: AiPromptSchema.describe(
      "AI prompt for generating personalized email content"
    ),

    // Contact selection
    selectedContactIds: ContactIdsSchema.describe(
      "Array of contact IDs to include in campaign"
    ),
  })
  .refine(
    (data) => {
      // Schedule hour validation
      if (
        data.sendStartHour !== undefined &&
        data.sendStartHour !== null &&
        data.sendEndHour !== undefined &&
        data.sendEndHour !== null
      ) {
        return data.sendStartHour <= data.sendEndHour;
      }
      return true;
    },
    {
      message: "sendStartHour must be less than or equal to sendEndHour",
      path: ["sendStartHour"],
    }
  )
  .refine(
    (data) => {
      // If one hour is set, both should be set
      const startSet = data.sendStartHour !== undefined && data.sendStartHour !== null;
      const endSet = data.sendEndHour !== undefined && data.sendEndHour !== null;
      return startSet === endSet;
    },
    {
      message: "Both sendStartHour and sendEndHour must be set together, or both omitted",
      path: ["sendStartHour"],
    }
  );

export type CampaignCreate = z.infer<typeof CampaignCreateSchema>;

// ============================================================================
// Campaign Update Schema
// ============================================================================

/**
 * Schema for updating an existing campaign
 * All fields are optional - only provided fields will be updated
 * Status transitions are validated separately
 */
export const CampaignUpdateSchema = z
  .object({
    // ID of campaign to update (required)
    id: z.string().uuid("Invalid campaign ID format"),

    // All fields from create schema, but optional
    name: CampaignNameSchema.optional().describe("New campaign name"),
    subject: SubjectSchema.optional().describe("New email subject line"),
    emailFormat: EmailFormatSchema.optional().describe(
      "New email format: 'html' or 'plain_text'"
    ),
    delaySeconds: z
      .number()
      .int()
      .min(0)
      .max(3600)
      .optional()
      .describe("New delay between sends in seconds"),

    // Status update
    status: CampaignStatusSchema.optional().describe(
      "New campaign status (draft, sending, paused, completed)"
    ),

    // Schedule fields
    sendStartHour: HourSchema.optional().nullable(),
    sendEndHour: HourSchema.optional().nullable(),
    sendDays: z
      .array(DayOfWeekSchema)
      .min(1)
      .max(7)
      .optional()
      .describe("New days of week to send"),
    timezone: z
      .string()
      .max(50)
      .optional()
      .nullable()
      .describe("New timezone"),

    // AI prompt
    aiPrompt: z
      .string()
      .max(10000)
      .trim()
      .optional()
      .nullable()
      .describe("New AI prompt"),

    // Contact selection (replace entire list)
    selectedContactIds: z
      .array(z.string().uuid())
      .optional()
      .describe("Replace selected contact IDs"),
  })
  .refine(
    (data) => {
      // Schedule hour validation if both are being updated
      if (
        data.sendStartHour !== undefined &&
        data.sendEndHour !== undefined &&
        data.sendStartHour !== null &&
        data.sendEndHour !== null
      ) {
        return data.sendStartHour <= data.sendEndHour;
      }
      return true;
    },
    {
      message: "sendStartHour must be less than or equal to sendEndHour",
      path: ["sendStartHour"],
    }
  );

export type CampaignUpdate = z.infer<typeof CampaignUpdateSchema>;

// ============================================================================
// Campaign List Filters Schema
// ============================================================================

/**
 * Schema for filtering and searching campaigns
 */
export const CampaignListFiltersSchema = z
  .object({
    // Search across name and subject
    search: z
      .string()
      .max(200, "Search query must be 200 characters or less")
      .trim()
      .optional()
      .describe("Search in campaign name and subject"),

    // Status filter
    status: CampaignStatusSchema.optional().describe(
      "Filter by campaign status"
    ),

    // Multiple statuses
    statuses: z
      .array(CampaignStatusSchema)
      .optional()
      .describe("Filter by multiple statuses"),

    // Email format filter
    emailFormat: EmailFormatSchema.optional().describe(
      "Filter by email format"
    ),

    // AI-generated filter
    hasAiPrompt: z
      .boolean()
      .optional()
      .describe("Filter campaigns with AI prompt"),

    // Contact count filters
    hasContacts: z
      .boolean()
      .optional()
      .describe("Filter campaigns with selected contacts"),
    minContacts: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Minimum number of selected contacts"),
    maxContacts: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Maximum number of selected contacts"),

    // Date filters
    createdAfter: z.coerce
      .date()
      .optional()
      .describe("Filter campaigns created after this date"),
    createdBefore: z.coerce
      .date()
      .optional()
      .describe("Filter campaigns created before this date"),
    sentAfter: z.coerce
      .date()
      .optional()
      .describe("Filter campaigns sent after this date"),
    sentBefore: z.coerce
      .date()
      .optional()
      .describe("Filter campaigns sent before this date"),

    // Sorting
    sortBy: z
      .enum(["createdAt", "sentAt", "name", "status"])
      .default("createdAt")
      .describe("Field to sort by"),
    sortOrder: SortOrderSchema.describe("Sort direction (asc or desc)"),

    // Include related data
    includeStats: z
      .boolean()
      .default(false)
      .describe("Include email statistics in response"),
    includeTemplates: z
      .boolean()
      .default(false)
      .describe("Include templates in response"),
  })
  .merge(PaginationSchema)
  .refine(
    (data) => {
      if (
        data.createdAfter !== undefined &&
        data.createdBefore !== undefined &&
        data.createdAfter > data.createdBefore
      ) {
        return false;
      }
      return true;
    },
    {
      message: "createdAfter cannot be after createdBefore",
      path: ["createdAfter"],
    }
  )
  .refine(
    (data) => {
      if (
        data.sentAfter !== undefined &&
        data.sentBefore !== undefined &&
        data.sentAfter > data.sentBefore
      ) {
        return false;
      }
      return true;
    },
    {
      message: "sentAfter cannot be after sentBefore",
      path: ["sentAfter"],
    }
  )
  .refine(
    (data) => {
      if (
        data.minContacts !== undefined &&
        data.maxContacts !== undefined &&
        data.minContacts > data.maxContacts
      ) {
        return false;
      }
      return true;
    },
    {
      message: "minContacts cannot be greater than maxContacts",
      path: ["minContacts"],
    }
  );

export type CampaignListFilters = z.infer<typeof CampaignListFiltersSchema>;

// ============================================================================
// Add/Remove Contacts Schemas
// ============================================================================

/**
 * Schema for adding contacts to a campaign
 */
export const CampaignAddContactsSchema = z.object({
  campaignId: z.string().uuid("Invalid campaign ID format"),
  contactIds: z
    .array(z.string().uuid("Invalid contact ID format"))
    .min(1, "At least one contact ID is required")
    .max(1000, "Cannot add more than 1000 contacts at once"),
});

export type CampaignAddContacts = z.infer<typeof CampaignAddContactsSchema>;

/**
 * Schema for removing contacts from a campaign
 */
export const CampaignRemoveContactsSchema = z.object({
  campaignId: z.string().uuid("Invalid campaign ID format"),
  contactIds: z
    .array(z.string().uuid("Invalid contact ID format"))
    .min(1, "At least one contact ID is required"),
});

export type CampaignRemoveContacts = z.infer<typeof CampaignRemoveContactsSchema>;

// ============================================================================
// Campaign Stats Schema
// ============================================================================

/**
 * Schema for campaign statistics request
 */
export const CampaignStatsRequestSchema = z.object({
  campaignId: z.string().uuid("Invalid campaign ID format"),
  groupByDomain: z.boolean().default(false).describe("Group stats by domain"),
  groupByTemplate: z.boolean().default(false).describe("Group stats by template"),
  includeTimeline: z.boolean().default(false).describe("Include timeline data"),
});

export type CampaignStatsRequest = z.infer<typeof CampaignStatsRequestSchema>;

// ============================================================================
// Response Types
// ============================================================================

/**
 * Basic campaign response shape
 */
export const CampaignResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  subject: z.string(),
  emailFormat: EmailFormatSchema,
  delaySeconds: z.number().int(),
  status: CampaignStatusSchema,
  selectedContactIds: z.array(z.string()),
  aiPrompt: z.string().nullable(),
  createdAt: z.coerce.date(),
  sentAt: z.coerce.date().nullable(),

  // Schedule
  sendStartHour: z.number().int().nullable(),
  sendEndHour: z.number().int().nullable(),
  sendDays: z.array(z.number().int()),
  timezone: z.string().nullable(),

  // Computed
  contactCount: z.number().int().optional(),
  templateCount: z.number().int().optional(),
});

export type CampaignResponse = z.infer<typeof CampaignResponseSchema>;

/**
 * Campaign with statistics
 */
export const CampaignWithStatsSchema = CampaignResponseSchema.extend({
  stats: z.object({
    total: z.number().int(),
    pending: z.number().int(),
    sent: z.number().int(),
    delivered: z.number().int(),
    opened: z.number().int(),
    clicked: z.number().int(),
    bounced: z.number().int(),
    failed: z.number().int(),

    // Rates (percentages)
    deliveryRate: z.number().min(0).max(100),
    openRate: z.number().min(0).max(100),
    clickRate: z.number().min(0).max(100),
    bounceRate: z.number().min(0).max(100),
  }).optional(),
});

export type CampaignWithStats = z.infer<typeof CampaignWithStatsSchema>;

/**
 * Template response within campaign
 */
export const CampaignTemplateResponseSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  versionName: z.string(),
  body: z.string(),
  sortOrder: z.number().int(),
});

export type CampaignTemplateResponse = z.infer<typeof CampaignTemplateResponseSchema>;

/**
 * Full campaign response with templates
 */
export const CampaignFullResponseSchema = CampaignWithStatsSchema.extend({
  templates: z.array(CampaignTemplateResponseSchema).optional(),
});

export type CampaignFullResponse = z.infer<typeof CampaignFullResponseSchema>;

/**
 * List response with pagination metadata
 */
export const CampaignListResponseSchema = z.object({
  campaigns: z.array(CampaignWithStatsSchema),
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
  hasMore: z.boolean(),
});

export type CampaignListResponse = z.infer<typeof CampaignListResponseSchema>;

/**
 * Campaign stats response
 */
export const CampaignStatsResponseSchema = z.object({
  campaignId: z.string().uuid(),
  overview: z.object({
    total: z.number().int(),
    pending: z.number().int(),
    sent: z.number().int(),
    delivered: z.number().int(),
    opened: z.number().int(),
    clicked: z.number().int(),
    bounced: z.number().int(),
    failed: z.number().int(),
  }),
  rates: z.object({
    deliveryRate: z.number(),
    openRate: z.number(),
    clickRate: z.number(),
    bounceRate: z.number(),
    failureRate: z.number(),
  }),
  byDomain: z
    .array(
      z.object({
        domainId: z.string().uuid(),
        domain: z.string(),
        total: z.number().int(),
        sent: z.number().int(),
        delivered: z.number().int(),
        opened: z.number().int(),
        clicked: z.number().int(),
        bounced: z.number().int(),
      })
    )
    .optional(),
  byTemplate: z
    .array(
      z.object({
        templateId: z.string().uuid(),
        versionName: z.string(),
        total: z.number().int(),
        sent: z.number().int(),
        delivered: z.number().int(),
        opened: z.number().int(),
        clicked: z.number().int(),
      })
    )
    .optional(),
  timeline: z
    .array(
      z.object({
        date: z.string(),
        sent: z.number().int(),
        delivered: z.number().int(),
        opened: z.number().int(),
        clicked: z.number().int(),
      })
    )
    .optional(),
});

export type CampaignStatsResponse = z.infer<typeof CampaignStatsResponseSchema>;

/**
 * Prepare campaign response
 */
export const CampaignPrepareResponseSchema = z.object({
  campaignId: z.string().uuid(),
  emailsCreated: z.number().int(),
  domainsUsed: z.number().int(),
  templatesUsed: z.number().int(),
});

export type CampaignPrepareResponse = z.infer<typeof CampaignPrepareResponseSchema>;

// ============================================================================
// Status Transition Validation
// ============================================================================

/**
 * Valid status transitions
 */
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["sending"],
  sending: ["paused", "completed"],
  paused: ["sending", "draft"],
  completed: [], // No transitions allowed from completed
};

/**
 * Validate a status transition
 */
export function isValidStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  return validTransitions.includes(newStatus);
}

/**
 * Get valid next statuses for a campaign
 */
export function getValidNextStatuses(currentStatus: string): string[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate campaign create input and return parsed data or errors
 */
export function validateCampaignCreate(input: unknown): {
  success: boolean;
  data?: CampaignCreate;
  errors?: Record<string, string[]>;
} {
  const result = CampaignCreateSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return { success: false, errors };
}

/**
 * Validate campaign update input and return parsed data or errors
 */
export function validateCampaignUpdate(input: unknown): {
  success: boolean;
  data?: CampaignUpdate;
  errors?: Record<string, string[]>;
} {
  const result = CampaignUpdateSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return { success: false, errors };
}

/**
 * Validate campaign list filters and return parsed data or errors
 */
export function validateCampaignListFilters(input: unknown): {
  success: boolean;
  data?: CampaignListFilters;
  errors?: Record<string, string[]>;
} {
  const result = CampaignListFiltersSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return { success: false, errors };
}

/**
 * Validate add contacts input and return parsed data or errors
 */
export function validateCampaignAddContacts(input: unknown): {
  success: boolean;
  data?: CampaignAddContacts;
  errors?: Record<string, string[]>;
} {
  const result = CampaignAddContactsSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return { success: false, errors };
}

/**
 * Validate campaign schedule and return parsed data or errors
 */
export function validateCampaignSchedule(input: unknown): {
  success: boolean;
  data?: CampaignSchedule;
  errors?: Record<string, string[]>;
} {
  const result = CampaignScheduleSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return { success: false, errors };
}

/**
 * Validate stats request and return parsed data or errors
 */
export function validateCampaignStatsRequest(input: unknown): {
  success: boolean;
  data?: CampaignStatsRequest;
  errors?: Record<string, string[]>;
} {
  const result = CampaignStatsRequestSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return { success: false, errors };
}

// ============================================================================
// Campaign Get Schema
// ============================================================================

/**
 * Schema for getting a single campaign by ID
 */
export const CampaignGetSchema = z.object({
  id: z.string().uuid("Invalid campaign ID format"),
  includeTemplates: z.boolean().default(true).describe("Include campaign templates"),
  includeStats: z.boolean().default(true).describe("Include email statistics"),
});

export type CampaignGet = z.infer<typeof CampaignGetSchema>;

/**
 * Validate campaign get input and return parsed data or errors
 */
export function validateCampaignGet(input: unknown): {
  success: boolean;
  data?: CampaignGet;
  errors?: Record<string, string[]>;
} {
  const result = CampaignGetSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return { success: false, errors };
}

// ============================================================================
// Campaign Delete Schema
// ============================================================================

/**
 * Schema for deleting a campaign by ID
 */
export const CampaignDeleteSchema = z.object({
  id: z.string().uuid("Invalid campaign ID format"),
});

export type CampaignDelete = z.infer<typeof CampaignDeleteSchema>;

/**
 * Validate campaign delete input and return parsed data or errors
 */
export function validateCampaignDelete(input: unknown): {
  success: boolean;
  data?: CampaignDelete;
  errors?: Record<string, string[]>;
} {
  const result = CampaignDeleteSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return { success: false, errors };
}

/**
 * Delete response type
 */
export interface CampaignDeleteResponse {
  success: boolean;
  deletedId: string;
  deletedTemplates: number;
  deletedEmails: number;
}
