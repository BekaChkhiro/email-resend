/**
 * Zod schemas for Campaign-related MCP tools
 */
import { z } from "zod";
/**
 * Email format enum
 */
export declare const EmailFormatSchema: z.ZodEnum<["html", "plain_text"]>;
export type EmailFormat = z.infer<typeof EmailFormatSchema>;
/**
 * Campaign schedule configuration
 */
export declare const CampaignScheduleSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    sendStartHour: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    sendEndHour: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    sendDays: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    timezone: z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>>;
}, "strip", z.ZodTypeAny, {
    sendDays: number[];
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    timezone?: string | null | undefined;
}, {
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    sendDays?: number[] | undefined;
    timezone?: string | null | undefined;
}>, {
    sendDays: number[];
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    timezone?: string | null | undefined;
}, {
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    sendDays?: number[] | undefined;
    timezone?: string | null | undefined;
}>, {
    sendDays: number[];
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    timezone?: string | null | undefined;
}, {
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    sendDays?: number[] | undefined;
    timezone?: string | null | undefined;
}>;
export type CampaignSchedule = z.infer<typeof CampaignScheduleSchema>;
/**
 * Schema for creating a new campaign
 * Required: name, subject
 * Optional: emailFormat, delaySeconds, schedule, aiPrompt, selectedContactIds
 */
export declare const CampaignCreateSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    subject: z.ZodString;
    emailFormat: z.ZodDefault<z.ZodEnum<["html", "plain_text"]>>;
    delaySeconds: z.ZodDefault<z.ZodNumber>;
    sendStartHour: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    sendEndHour: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    sendDays: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    timezone: z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>>;
    aiPrompt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    selectedContactIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    sendDays: number[];
    subject: string;
    emailFormat: "html" | "plain_text";
    delaySeconds: number;
    selectedContactIds: string[];
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    timezone?: string | null | undefined;
    aiPrompt?: string | null | undefined;
}, {
    name: string;
    subject: string;
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    sendDays?: number[] | undefined;
    timezone?: string | null | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    delaySeconds?: number | undefined;
    aiPrompt?: string | null | undefined;
    selectedContactIds?: string[] | undefined;
}>, {
    name: string;
    sendDays: number[];
    subject: string;
    emailFormat: "html" | "plain_text";
    delaySeconds: number;
    selectedContactIds: string[];
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    timezone?: string | null | undefined;
    aiPrompt?: string | null | undefined;
}, {
    name: string;
    subject: string;
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    sendDays?: number[] | undefined;
    timezone?: string | null | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    delaySeconds?: number | undefined;
    aiPrompt?: string | null | undefined;
    selectedContactIds?: string[] | undefined;
}>, {
    name: string;
    sendDays: number[];
    subject: string;
    emailFormat: "html" | "plain_text";
    delaySeconds: number;
    selectedContactIds: string[];
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    timezone?: string | null | undefined;
    aiPrompt?: string | null | undefined;
}, {
    name: string;
    subject: string;
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    sendDays?: number[] | undefined;
    timezone?: string | null | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    delaySeconds?: number | undefined;
    aiPrompt?: string | null | undefined;
    selectedContactIds?: string[] | undefined;
}>;
export type CampaignCreate = z.infer<typeof CampaignCreateSchema>;
/**
 * Schema for updating an existing campaign
 * All fields are optional - only provided fields will be updated
 * Status transitions are validated separately
 */
export declare const CampaignUpdateSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    subject: z.ZodOptional<z.ZodString>;
    emailFormat: z.ZodOptional<z.ZodEnum<["html", "plain_text"]>>;
    delaySeconds: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["draft", "sending", "paused", "completed"]>>;
    sendStartHour: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    sendEndHour: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    sendDays: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    timezone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    aiPrompt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    selectedContactIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status?: "draft" | "sending" | "paused" | "completed" | undefined;
    name?: string | undefined;
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    sendDays?: number[] | undefined;
    timezone?: string | null | undefined;
    subject?: string | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    delaySeconds?: number | undefined;
    aiPrompt?: string | null | undefined;
    selectedContactIds?: string[] | undefined;
}, {
    id: string;
    status?: "draft" | "sending" | "paused" | "completed" | undefined;
    name?: string | undefined;
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    sendDays?: number[] | undefined;
    timezone?: string | null | undefined;
    subject?: string | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    delaySeconds?: number | undefined;
    aiPrompt?: string | null | undefined;
    selectedContactIds?: string[] | undefined;
}>, {
    id: string;
    status?: "draft" | "sending" | "paused" | "completed" | undefined;
    name?: string | undefined;
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    sendDays?: number[] | undefined;
    timezone?: string | null | undefined;
    subject?: string | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    delaySeconds?: number | undefined;
    aiPrompt?: string | null | undefined;
    selectedContactIds?: string[] | undefined;
}, {
    id: string;
    status?: "draft" | "sending" | "paused" | "completed" | undefined;
    name?: string | undefined;
    sendStartHour?: number | null | undefined;
    sendEndHour?: number | null | undefined;
    sendDays?: number[] | undefined;
    timezone?: string | null | undefined;
    subject?: string | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    delaySeconds?: number | undefined;
    aiPrompt?: string | null | undefined;
    selectedContactIds?: string[] | undefined;
}>;
export type CampaignUpdate = z.infer<typeof CampaignUpdateSchema>;
/**
 * Schema for filtering and searching campaigns
 */
export declare const CampaignListFiltersSchema: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "sending", "paused", "completed"]>>;
    statuses: z.ZodOptional<z.ZodArray<z.ZodEnum<["draft", "sending", "paused", "completed"]>, "many">>;
    emailFormat: z.ZodOptional<z.ZodEnum<["html", "plain_text"]>>;
    hasAiPrompt: z.ZodOptional<z.ZodBoolean>;
    hasContacts: z.ZodOptional<z.ZodBoolean>;
    minContacts: z.ZodOptional<z.ZodNumber>;
    maxContacts: z.ZodOptional<z.ZodNumber>;
    createdAfter: z.ZodOptional<z.ZodDate>;
    createdBefore: z.ZodOptional<z.ZodDate>;
    sentAfter: z.ZodOptional<z.ZodDate>;
    sentBefore: z.ZodOptional<z.ZodDate>;
    sortBy: z.ZodDefault<z.ZodEnum<["createdAt", "sentAt", "name", "status"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    includeStats: z.ZodDefault<z.ZodBoolean>;
    includeTemplates: z.ZodDefault<z.ZodBoolean>;
} & {
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    sortBy: "status" | "name" | "createdAt" | "sentAt";
    sortOrder: "asc" | "desc";
    includeStats: boolean;
    includeTemplates: boolean;
    status?: "draft" | "sending" | "paused" | "completed" | undefined;
    search?: string | undefined;
    createdAfter?: Date | undefined;
    createdBefore?: Date | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    statuses?: ("draft" | "sending" | "paused" | "completed")[] | undefined;
    hasAiPrompt?: boolean | undefined;
    hasContacts?: boolean | undefined;
    minContacts?: number | undefined;
    maxContacts?: number | undefined;
    sentAfter?: Date | undefined;
    sentBefore?: Date | undefined;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    status?: "draft" | "sending" | "paused" | "completed" | undefined;
    search?: string | undefined;
    sortBy?: "status" | "name" | "createdAt" | "sentAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    createdAfter?: Date | undefined;
    createdBefore?: Date | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    statuses?: ("draft" | "sending" | "paused" | "completed")[] | undefined;
    hasAiPrompt?: boolean | undefined;
    hasContacts?: boolean | undefined;
    minContacts?: number | undefined;
    maxContacts?: number | undefined;
    sentAfter?: Date | undefined;
    sentBefore?: Date | undefined;
    includeStats?: boolean | undefined;
    includeTemplates?: boolean | undefined;
}>, {
    limit: number;
    offset: number;
    sortBy: "status" | "name" | "createdAt" | "sentAt";
    sortOrder: "asc" | "desc";
    includeStats: boolean;
    includeTemplates: boolean;
    status?: "draft" | "sending" | "paused" | "completed" | undefined;
    search?: string | undefined;
    createdAfter?: Date | undefined;
    createdBefore?: Date | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    statuses?: ("draft" | "sending" | "paused" | "completed")[] | undefined;
    hasAiPrompt?: boolean | undefined;
    hasContacts?: boolean | undefined;
    minContacts?: number | undefined;
    maxContacts?: number | undefined;
    sentAfter?: Date | undefined;
    sentBefore?: Date | undefined;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    status?: "draft" | "sending" | "paused" | "completed" | undefined;
    search?: string | undefined;
    sortBy?: "status" | "name" | "createdAt" | "sentAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    createdAfter?: Date | undefined;
    createdBefore?: Date | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    statuses?: ("draft" | "sending" | "paused" | "completed")[] | undefined;
    hasAiPrompt?: boolean | undefined;
    hasContacts?: boolean | undefined;
    minContacts?: number | undefined;
    maxContacts?: number | undefined;
    sentAfter?: Date | undefined;
    sentBefore?: Date | undefined;
    includeStats?: boolean | undefined;
    includeTemplates?: boolean | undefined;
}>, {
    limit: number;
    offset: number;
    sortBy: "status" | "name" | "createdAt" | "sentAt";
    sortOrder: "asc" | "desc";
    includeStats: boolean;
    includeTemplates: boolean;
    status?: "draft" | "sending" | "paused" | "completed" | undefined;
    search?: string | undefined;
    createdAfter?: Date | undefined;
    createdBefore?: Date | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    statuses?: ("draft" | "sending" | "paused" | "completed")[] | undefined;
    hasAiPrompt?: boolean | undefined;
    hasContacts?: boolean | undefined;
    minContacts?: number | undefined;
    maxContacts?: number | undefined;
    sentAfter?: Date | undefined;
    sentBefore?: Date | undefined;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    status?: "draft" | "sending" | "paused" | "completed" | undefined;
    search?: string | undefined;
    sortBy?: "status" | "name" | "createdAt" | "sentAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    createdAfter?: Date | undefined;
    createdBefore?: Date | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    statuses?: ("draft" | "sending" | "paused" | "completed")[] | undefined;
    hasAiPrompt?: boolean | undefined;
    hasContacts?: boolean | undefined;
    minContacts?: number | undefined;
    maxContacts?: number | undefined;
    sentAfter?: Date | undefined;
    sentBefore?: Date | undefined;
    includeStats?: boolean | undefined;
    includeTemplates?: boolean | undefined;
}>, {
    limit: number;
    offset: number;
    sortBy: "status" | "name" | "createdAt" | "sentAt";
    sortOrder: "asc" | "desc";
    includeStats: boolean;
    includeTemplates: boolean;
    status?: "draft" | "sending" | "paused" | "completed" | undefined;
    search?: string | undefined;
    createdAfter?: Date | undefined;
    createdBefore?: Date | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    statuses?: ("draft" | "sending" | "paused" | "completed")[] | undefined;
    hasAiPrompt?: boolean | undefined;
    hasContacts?: boolean | undefined;
    minContacts?: number | undefined;
    maxContacts?: number | undefined;
    sentAfter?: Date | undefined;
    sentBefore?: Date | undefined;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    status?: "draft" | "sending" | "paused" | "completed" | undefined;
    search?: string | undefined;
    sortBy?: "status" | "name" | "createdAt" | "sentAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    createdAfter?: Date | undefined;
    createdBefore?: Date | undefined;
    emailFormat?: "html" | "plain_text" | undefined;
    statuses?: ("draft" | "sending" | "paused" | "completed")[] | undefined;
    hasAiPrompt?: boolean | undefined;
    hasContacts?: boolean | undefined;
    minContacts?: number | undefined;
    maxContacts?: number | undefined;
    sentAfter?: Date | undefined;
    sentBefore?: Date | undefined;
    includeStats?: boolean | undefined;
    includeTemplates?: boolean | undefined;
}>;
export type CampaignListFilters = z.infer<typeof CampaignListFiltersSchema>;
/**
 * Schema for adding contacts to a campaign
 */
export declare const CampaignAddContactsSchema: z.ZodObject<{
    campaignId: z.ZodString;
    contactIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
    contactIds: string[];
}, {
    campaignId: string;
    contactIds: string[];
}>;
export type CampaignAddContacts = z.infer<typeof CampaignAddContactsSchema>;
/**
 * Schema for removing contacts from a campaign
 */
export declare const CampaignRemoveContactsSchema: z.ZodObject<{
    campaignId: z.ZodString;
    contactIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
    contactIds: string[];
}, {
    campaignId: string;
    contactIds: string[];
}>;
export type CampaignRemoveContacts = z.infer<typeof CampaignRemoveContactsSchema>;
/**
 * Schema for campaign statistics request
 */
export declare const CampaignStatsRequestSchema: z.ZodObject<{
    campaignId: z.ZodString;
    groupByDomain: z.ZodDefault<z.ZodBoolean>;
    groupByTemplate: z.ZodDefault<z.ZodBoolean>;
    includeTimeline: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
    groupByDomain: boolean;
    groupByTemplate: boolean;
    includeTimeline: boolean;
}, {
    campaignId: string;
    groupByDomain?: boolean | undefined;
    groupByTemplate?: boolean | undefined;
    includeTimeline?: boolean | undefined;
}>;
export type CampaignStatsRequest = z.infer<typeof CampaignStatsRequestSchema>;
/**
 * Basic campaign response shape
 */
export declare const CampaignResponseSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    subject: z.ZodString;
    emailFormat: z.ZodEnum<["html", "plain_text"]>;
    delaySeconds: z.ZodNumber;
    status: z.ZodEnum<["draft", "sending", "paused", "completed"]>;
    selectedContactIds: z.ZodArray<z.ZodString, "many">;
    aiPrompt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
    sentAt: z.ZodNullable<z.ZodDate>;
    sendStartHour: z.ZodNullable<z.ZodNumber>;
    sendEndHour: z.ZodNullable<z.ZodNumber>;
    sendDays: z.ZodArray<z.ZodNumber, "many">;
    timezone: z.ZodNullable<z.ZodString>;
    contactCount: z.ZodOptional<z.ZodNumber>;
    templateCount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "sending" | "paused" | "completed";
    id: string;
    name: string;
    createdAt: Date;
    sendStartHour: number | null;
    sendEndHour: number | null;
    sendDays: number[];
    timezone: string | null;
    subject: string;
    emailFormat: "html" | "plain_text";
    delaySeconds: number;
    aiPrompt: string | null;
    selectedContactIds: string[];
    sentAt: Date | null;
    contactCount?: number | undefined;
    templateCount?: number | undefined;
}, {
    status: "draft" | "sending" | "paused" | "completed";
    id: string;
    name: string;
    createdAt: Date;
    sendStartHour: number | null;
    sendEndHour: number | null;
    sendDays: number[];
    timezone: string | null;
    subject: string;
    emailFormat: "html" | "plain_text";
    delaySeconds: number;
    aiPrompt: string | null;
    selectedContactIds: string[];
    sentAt: Date | null;
    contactCount?: number | undefined;
    templateCount?: number | undefined;
}>;
export type CampaignResponse = z.infer<typeof CampaignResponseSchema>;
/**
 * Campaign with statistics
 */
export declare const CampaignWithStatsSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    subject: z.ZodString;
    emailFormat: z.ZodEnum<["html", "plain_text"]>;
    delaySeconds: z.ZodNumber;
    status: z.ZodEnum<["draft", "sending", "paused", "completed"]>;
    selectedContactIds: z.ZodArray<z.ZodString, "many">;
    aiPrompt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
    sentAt: z.ZodNullable<z.ZodDate>;
    sendStartHour: z.ZodNullable<z.ZodNumber>;
    sendEndHour: z.ZodNullable<z.ZodNumber>;
    sendDays: z.ZodArray<z.ZodNumber, "many">;
    timezone: z.ZodNullable<z.ZodString>;
    contactCount: z.ZodOptional<z.ZodNumber>;
    templateCount: z.ZodOptional<z.ZodNumber>;
} & {
    stats: z.ZodOptional<z.ZodObject<{
        total: z.ZodNumber;
        pending: z.ZodNumber;
        sent: z.ZodNumber;
        delivered: z.ZodNumber;
        opened: z.ZodNumber;
        clicked: z.ZodNumber;
        bounced: z.ZodNumber;
        failed: z.ZodNumber;
        deliveryRate: z.ZodNumber;
        openRate: z.ZodNumber;
        clickRate: z.ZodNumber;
        bounceRate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
        total: number;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        bounceRate: number;
    }, {
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
        total: number;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        bounceRate: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "sending" | "paused" | "completed";
    id: string;
    name: string;
    createdAt: Date;
    sendStartHour: number | null;
    sendEndHour: number | null;
    sendDays: number[];
    timezone: string | null;
    subject: string;
    emailFormat: "html" | "plain_text";
    delaySeconds: number;
    aiPrompt: string | null;
    selectedContactIds: string[];
    sentAt: Date | null;
    contactCount?: number | undefined;
    templateCount?: number | undefined;
    stats?: {
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
        total: number;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        bounceRate: number;
    } | undefined;
}, {
    status: "draft" | "sending" | "paused" | "completed";
    id: string;
    name: string;
    createdAt: Date;
    sendStartHour: number | null;
    sendEndHour: number | null;
    sendDays: number[];
    timezone: string | null;
    subject: string;
    emailFormat: "html" | "plain_text";
    delaySeconds: number;
    aiPrompt: string | null;
    selectedContactIds: string[];
    sentAt: Date | null;
    contactCount?: number | undefined;
    templateCount?: number | undefined;
    stats?: {
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
        total: number;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        bounceRate: number;
    } | undefined;
}>;
export type CampaignWithStats = z.infer<typeof CampaignWithStatsSchema>;
/**
 * Template response within campaign
 */
export declare const CampaignTemplateResponseSchema: z.ZodObject<{
    id: z.ZodString;
    campaignId: z.ZodString;
    versionName: z.ZodString;
    body: z.ZodString;
    sortOrder: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    sortOrder: number;
    campaignId: string;
    versionName: string;
    body: string;
}, {
    id: string;
    sortOrder: number;
    campaignId: string;
    versionName: string;
    body: string;
}>;
export type CampaignTemplateResponse = z.infer<typeof CampaignTemplateResponseSchema>;
/**
 * Full campaign response with templates
 */
export declare const CampaignFullResponseSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    subject: z.ZodString;
    emailFormat: z.ZodEnum<["html", "plain_text"]>;
    delaySeconds: z.ZodNumber;
    status: z.ZodEnum<["draft", "sending", "paused", "completed"]>;
    selectedContactIds: z.ZodArray<z.ZodString, "many">;
    aiPrompt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
    sentAt: z.ZodNullable<z.ZodDate>;
    sendStartHour: z.ZodNullable<z.ZodNumber>;
    sendEndHour: z.ZodNullable<z.ZodNumber>;
    sendDays: z.ZodArray<z.ZodNumber, "many">;
    timezone: z.ZodNullable<z.ZodString>;
    contactCount: z.ZodOptional<z.ZodNumber>;
    templateCount: z.ZodOptional<z.ZodNumber>;
} & {
    stats: z.ZodOptional<z.ZodObject<{
        total: z.ZodNumber;
        pending: z.ZodNumber;
        sent: z.ZodNumber;
        delivered: z.ZodNumber;
        opened: z.ZodNumber;
        clicked: z.ZodNumber;
        bounced: z.ZodNumber;
        failed: z.ZodNumber;
        deliveryRate: z.ZodNumber;
        openRate: z.ZodNumber;
        clickRate: z.ZodNumber;
        bounceRate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
        total: number;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        bounceRate: number;
    }, {
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
        total: number;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        bounceRate: number;
    }>>;
} & {
    templates: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        campaignId: z.ZodString;
        versionName: z.ZodString;
        body: z.ZodString;
        sortOrder: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        sortOrder: number;
        campaignId: string;
        versionName: string;
        body: string;
    }, {
        id: string;
        sortOrder: number;
        campaignId: string;
        versionName: string;
        body: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "sending" | "paused" | "completed";
    id: string;
    name: string;
    createdAt: Date;
    sendStartHour: number | null;
    sendEndHour: number | null;
    sendDays: number[];
    timezone: string | null;
    subject: string;
    emailFormat: "html" | "plain_text";
    delaySeconds: number;
    aiPrompt: string | null;
    selectedContactIds: string[];
    sentAt: Date | null;
    contactCount?: number | undefined;
    templateCount?: number | undefined;
    stats?: {
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
        total: number;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        bounceRate: number;
    } | undefined;
    templates?: {
        id: string;
        sortOrder: number;
        campaignId: string;
        versionName: string;
        body: string;
    }[] | undefined;
}, {
    status: "draft" | "sending" | "paused" | "completed";
    id: string;
    name: string;
    createdAt: Date;
    sendStartHour: number | null;
    sendEndHour: number | null;
    sendDays: number[];
    timezone: string | null;
    subject: string;
    emailFormat: "html" | "plain_text";
    delaySeconds: number;
    aiPrompt: string | null;
    selectedContactIds: string[];
    sentAt: Date | null;
    contactCount?: number | undefined;
    templateCount?: number | undefined;
    stats?: {
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
        total: number;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        bounceRate: number;
    } | undefined;
    templates?: {
        id: string;
        sortOrder: number;
        campaignId: string;
        versionName: string;
        body: string;
    }[] | undefined;
}>;
export type CampaignFullResponse = z.infer<typeof CampaignFullResponseSchema>;
/**
 * List response with pagination metadata
 */
export declare const CampaignListResponseSchema: z.ZodObject<{
    campaigns: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        subject: z.ZodString;
        emailFormat: z.ZodEnum<["html", "plain_text"]>;
        delaySeconds: z.ZodNumber;
        status: z.ZodEnum<["draft", "sending", "paused", "completed"]>;
        selectedContactIds: z.ZodArray<z.ZodString, "many">;
        aiPrompt: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodDate;
        sentAt: z.ZodNullable<z.ZodDate>;
        sendStartHour: z.ZodNullable<z.ZodNumber>;
        sendEndHour: z.ZodNullable<z.ZodNumber>;
        sendDays: z.ZodArray<z.ZodNumber, "many">;
        timezone: z.ZodNullable<z.ZodString>;
        contactCount: z.ZodOptional<z.ZodNumber>;
        templateCount: z.ZodOptional<z.ZodNumber>;
    } & {
        stats: z.ZodOptional<z.ZodObject<{
            total: z.ZodNumber;
            pending: z.ZodNumber;
            sent: z.ZodNumber;
            delivered: z.ZodNumber;
            opened: z.ZodNumber;
            clicked: z.ZodNumber;
            bounced: z.ZodNumber;
            failed: z.ZodNumber;
            deliveryRate: z.ZodNumber;
            openRate: z.ZodNumber;
            clickRate: z.ZodNumber;
            bounceRate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            pending: number;
            sent: number;
            delivered: number;
            opened: number;
            clicked: number;
            bounced: number;
            failed: number;
            total: number;
            deliveryRate: number;
            openRate: number;
            clickRate: number;
            bounceRate: number;
        }, {
            pending: number;
            sent: number;
            delivered: number;
            opened: number;
            clicked: number;
            bounced: number;
            failed: number;
            total: number;
            deliveryRate: number;
            openRate: number;
            clickRate: number;
            bounceRate: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "sending" | "paused" | "completed";
        id: string;
        name: string;
        createdAt: Date;
        sendStartHour: number | null;
        sendEndHour: number | null;
        sendDays: number[];
        timezone: string | null;
        subject: string;
        emailFormat: "html" | "plain_text";
        delaySeconds: number;
        aiPrompt: string | null;
        selectedContactIds: string[];
        sentAt: Date | null;
        contactCount?: number | undefined;
        templateCount?: number | undefined;
        stats?: {
            pending: number;
            sent: number;
            delivered: number;
            opened: number;
            clicked: number;
            bounced: number;
            failed: number;
            total: number;
            deliveryRate: number;
            openRate: number;
            clickRate: number;
            bounceRate: number;
        } | undefined;
    }, {
        status: "draft" | "sending" | "paused" | "completed";
        id: string;
        name: string;
        createdAt: Date;
        sendStartHour: number | null;
        sendEndHour: number | null;
        sendDays: number[];
        timezone: string | null;
        subject: string;
        emailFormat: "html" | "plain_text";
        delaySeconds: number;
        aiPrompt: string | null;
        selectedContactIds: string[];
        sentAt: Date | null;
        contactCount?: number | undefined;
        templateCount?: number | undefined;
        stats?: {
            pending: number;
            sent: number;
            delivered: number;
            opened: number;
            clicked: number;
            bounced: number;
            failed: number;
            total: number;
            deliveryRate: number;
            openRate: number;
            clickRate: number;
            bounceRate: number;
        } | undefined;
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
    campaigns: {
        status: "draft" | "sending" | "paused" | "completed";
        id: string;
        name: string;
        createdAt: Date;
        sendStartHour: number | null;
        sendEndHour: number | null;
        sendDays: number[];
        timezone: string | null;
        subject: string;
        emailFormat: "html" | "plain_text";
        delaySeconds: number;
        aiPrompt: string | null;
        selectedContactIds: string[];
        sentAt: Date | null;
        contactCount?: number | undefined;
        templateCount?: number | undefined;
        stats?: {
            pending: number;
            sent: number;
            delivered: number;
            opened: number;
            clicked: number;
            bounced: number;
            failed: number;
            total: number;
            deliveryRate: number;
            openRate: number;
            clickRate: number;
            bounceRate: number;
        } | undefined;
    }[];
}, {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
    campaigns: {
        status: "draft" | "sending" | "paused" | "completed";
        id: string;
        name: string;
        createdAt: Date;
        sendStartHour: number | null;
        sendEndHour: number | null;
        sendDays: number[];
        timezone: string | null;
        subject: string;
        emailFormat: "html" | "plain_text";
        delaySeconds: number;
        aiPrompt: string | null;
        selectedContactIds: string[];
        sentAt: Date | null;
        contactCount?: number | undefined;
        templateCount?: number | undefined;
        stats?: {
            pending: number;
            sent: number;
            delivered: number;
            opened: number;
            clicked: number;
            bounced: number;
            failed: number;
            total: number;
            deliveryRate: number;
            openRate: number;
            clickRate: number;
            bounceRate: number;
        } | undefined;
    }[];
}>;
export type CampaignListResponse = z.infer<typeof CampaignListResponseSchema>;
/**
 * Campaign stats response
 */
export declare const CampaignStatsResponseSchema: z.ZodObject<{
    campaignId: z.ZodString;
    overview: z.ZodObject<{
        total: z.ZodNumber;
        pending: z.ZodNumber;
        sent: z.ZodNumber;
        delivered: z.ZodNumber;
        opened: z.ZodNumber;
        clicked: z.ZodNumber;
        bounced: z.ZodNumber;
        failed: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
        total: number;
    }, {
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
        total: number;
    }>;
    rates: z.ZodObject<{
        deliveryRate: z.ZodNumber;
        openRate: z.ZodNumber;
        clickRate: z.ZodNumber;
        bounceRate: z.ZodNumber;
        failureRate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        bounceRate: number;
        failureRate: number;
    }, {
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        bounceRate: number;
        failureRate: number;
    }>;
    byDomain: z.ZodOptional<z.ZodArray<z.ZodObject<{
        domainId: z.ZodString;
        domain: z.ZodString;
        total: z.ZodNumber;
        sent: z.ZodNumber;
        delivered: z.ZodNumber;
        opened: z.ZodNumber;
        clicked: z.ZodNumber;
        bounced: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        domain: string;
        total: number;
        domainId: string;
    }, {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        domain: string;
        total: number;
        domainId: string;
    }>, "many">>;
    byTemplate: z.ZodOptional<z.ZodArray<z.ZodObject<{
        templateId: z.ZodString;
        versionName: z.ZodString;
        total: z.ZodNumber;
        sent: z.ZodNumber;
        delivered: z.ZodNumber;
        opened: z.ZodNumber;
        clicked: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        total: number;
        versionName: string;
        templateId: string;
    }, {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        total: number;
        versionName: string;
        templateId: string;
    }>, "many">>;
    timeline: z.ZodOptional<z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        sent: z.ZodNumber;
        delivered: z.ZodNumber;
        opened: z.ZodNumber;
        clicked: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        date: string;
    }, {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        date: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
    overview: {
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
        total: number;
    };
    rates: {
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        bounceRate: number;
        failureRate: number;
    };
    byDomain?: {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        domain: string;
        total: number;
        domainId: string;
    }[] | undefined;
    byTemplate?: {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        total: number;
        versionName: string;
        templateId: string;
    }[] | undefined;
    timeline?: {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        date: string;
    }[] | undefined;
}, {
    campaignId: string;
    overview: {
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
        total: number;
    };
    rates: {
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        bounceRate: number;
        failureRate: number;
    };
    byDomain?: {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        domain: string;
        total: number;
        domainId: string;
    }[] | undefined;
    byTemplate?: {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        total: number;
        versionName: string;
        templateId: string;
    }[] | undefined;
    timeline?: {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        date: string;
    }[] | undefined;
}>;
export type CampaignStatsResponse = z.infer<typeof CampaignStatsResponseSchema>;
/**
 * Prepare campaign response
 */
export declare const CampaignPrepareResponseSchema: z.ZodObject<{
    campaignId: z.ZodString;
    emailsCreated: z.ZodNumber;
    domainsUsed: z.ZodNumber;
    templatesUsed: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
    emailsCreated: number;
    domainsUsed: number;
    templatesUsed: number;
}, {
    campaignId: string;
    emailsCreated: number;
    domainsUsed: number;
    templatesUsed: number;
}>;
export type CampaignPrepareResponse = z.infer<typeof CampaignPrepareResponseSchema>;
/**
 * Validate a status transition
 */
export declare function isValidStatusTransition(currentStatus: string, newStatus: string): boolean;
/**
 * Get valid next statuses for a campaign
 */
export declare function getValidNextStatuses(currentStatus: string): string[];
/**
 * Validate campaign create input and return parsed data or errors
 */
export declare function validateCampaignCreate(input: unknown): {
    success: boolean;
    data?: CampaignCreate;
    errors?: Record<string, string[]>;
};
/**
 * Validate campaign update input and return parsed data or errors
 */
export declare function validateCampaignUpdate(input: unknown): {
    success: boolean;
    data?: CampaignUpdate;
    errors?: Record<string, string[]>;
};
/**
 * Validate campaign list filters and return parsed data or errors
 */
export declare function validateCampaignListFilters(input: unknown): {
    success: boolean;
    data?: CampaignListFilters;
    errors?: Record<string, string[]>;
};
/**
 * Validate add contacts input and return parsed data or errors
 */
export declare function validateCampaignAddContacts(input: unknown): {
    success: boolean;
    data?: CampaignAddContacts;
    errors?: Record<string, string[]>;
};
/**
 * Validate campaign schedule and return parsed data or errors
 */
export declare function validateCampaignSchedule(input: unknown): {
    success: boolean;
    data?: CampaignSchedule;
    errors?: Record<string, string[]>;
};
/**
 * Validate stats request and return parsed data or errors
 */
export declare function validateCampaignStatsRequest(input: unknown): {
    success: boolean;
    data?: CampaignStatsRequest;
    errors?: Record<string, string[]>;
};
/**
 * Schema for getting a single campaign by ID
 */
export declare const CampaignGetSchema: z.ZodObject<{
    id: z.ZodString;
    includeTemplates: z.ZodDefault<z.ZodBoolean>;
    includeStats: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    includeStats: boolean;
    includeTemplates: boolean;
}, {
    id: string;
    includeStats?: boolean | undefined;
    includeTemplates?: boolean | undefined;
}>;
export type CampaignGet = z.infer<typeof CampaignGetSchema>;
/**
 * Validate campaign get input and return parsed data or errors
 */
export declare function validateCampaignGet(input: unknown): {
    success: boolean;
    data?: CampaignGet;
    errors?: Record<string, string[]>;
};
/**
 * Schema for deleting a campaign by ID
 */
export declare const CampaignDeleteSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type CampaignDelete = z.infer<typeof CampaignDeleteSchema>;
/**
 * Validate campaign delete input and return parsed data or errors
 */
export declare function validateCampaignDelete(input: unknown): {
    success: boolean;
    data?: CampaignDelete;
    errors?: Record<string, string[]>;
};
/**
 * Delete response type
 */
export interface CampaignDeleteResponse {
    success: boolean;
    deletedId: string;
    deletedTemplates: number;
    deletedEmails: number;
}
//# sourceMappingURL=campaigns.d.ts.map