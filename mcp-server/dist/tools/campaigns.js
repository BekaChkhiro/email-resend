/**
 * Campaign management MCP tools
 */
import { registerTool } from "./index.js";
import { prisma, withDb } from "../utils/db.js";
import { ValidationError } from "../utils/errors.js";
import { validateCampaignListFilters, validateCampaignGet, validateCampaignCreate, validateCampaignUpdate, validateCampaignDelete, validateCampaignAddContacts, isValidStatusTransition, getValidNextStatuses, } from "../schemas/campaigns.js";
// ============================================================================
// campaigns_list Tool
// ============================================================================
/**
 * List campaigns with filtering, searching, and pagination
 */
async function campaignsList(args) {
    // Validate input
    const validation = validateCampaignListFilters(args);
    if (!validation.success) {
        throw new ValidationError("Invalid filter parameters", validation.errors);
    }
    const filters = validation.data;
    // Build where clause
    const where = {};
    const andConditions = [];
    // Global search across name and subject
    if (filters.search) {
        where.OR = [
            { name: { contains: filters.search, mode: "insensitive" } },
            { subject: { contains: filters.search, mode: "insensitive" } },
        ];
    }
    // Status filter (single)
    if (filters.status) {
        andConditions.push({ status: filters.status });
    }
    // Status filter (multiple)
    if (filters.statuses && filters.statuses.length > 0) {
        andConditions.push({ status: { in: filters.statuses } });
    }
    // Email format filter
    if (filters.emailFormat) {
        andConditions.push({ emailFormat: filters.emailFormat });
    }
    // AI prompt filter
    if (filters.hasAiPrompt !== undefined) {
        if (filters.hasAiPrompt) {
            andConditions.push({
                aiPrompt: { not: null },
            });
        }
        else {
            andConditions.push({
                aiPrompt: null,
            });
        }
    }
    // Has contacts filter
    if (filters.hasContacts !== undefined) {
        if (filters.hasContacts) {
            andConditions.push({
                NOT: { selectedContactIds: { isEmpty: true } },
            });
        }
        else {
            andConditions.push({
                selectedContactIds: { isEmpty: true },
            });
        }
    }
    // Date filters
    if (filters.createdAfter) {
        andConditions.push({
            createdAt: { gte: filters.createdAfter },
        });
    }
    if (filters.createdBefore) {
        andConditions.push({
            createdAt: { lte: filters.createdBefore },
        });
    }
    if (filters.sentAfter) {
        andConditions.push({
            sentAt: { gte: filters.sentAfter },
        });
    }
    if (filters.sentBefore) {
        andConditions.push({
            sentAt: { lte: filters.sentBefore },
        });
    }
    // Add AND conditions if any exist
    if (andConditions.length > 0) {
        where.AND = andConditions;
    }
    // Build order by clause
    const orderBy = {
        [filters.sortBy]: filters.sortOrder,
    };
    // Execute queries
    const [campaigns, total] = await withDb(async () => {
        return Promise.all([
            prisma.campaign.findMany({
                where,
                orderBy,
                skip: filters.offset,
                take: filters.limit,
                include: {
                    _count: {
                        select: {
                            templates: true,
                            emails: true,
                        },
                    },
                },
            }),
            prisma.campaign.count({ where }),
        ]);
    });
    // Filter by contact count if specified (post-query filter due to array length)
    let filteredCampaigns = campaigns;
    if (filters.minContacts !== undefined) {
        filteredCampaigns = filteredCampaigns.filter((c) => c.selectedContactIds.length >= filters.minContacts);
    }
    if (filters.maxContacts !== undefined) {
        filteredCampaigns = filteredCampaigns.filter((c) => c.selectedContactIds.length <= filters.maxContacts);
    }
    // Get stats if requested
    let statsMap = new Map();
    if (filters.includeStats && filteredCampaigns.length > 0) {
        const campaignIds = filteredCampaigns.map((c) => c.id);
        // Get email stats for all campaigns
        const emailStats = await withDb(async () => {
            return prisma.campaignEmail.groupBy({
                by: ["campaignId", "status"],
                where: {
                    campaignId: { in: campaignIds },
                },
                _count: true,
            });
        });
        // Process stats into a map
        for (const campaign of filteredCampaigns) {
            const campaignStats = emailStats.filter((s) => s.campaignId === campaign.id);
            const stats = {
                campaignId: campaign.id,
                total: 0,
                pending: 0,
                sent: 0,
                delivered: 0,
                opened: 0,
                clicked: 0,
                bounced: 0,
                failed: 0,
            };
            for (const stat of campaignStats) {
                const typedStat = stat;
                const count = typedStat._count;
                stats.total += count;
                switch (typedStat.status) {
                    case "pending":
                        stats.pending = count;
                        break;
                    case "sent":
                        stats.sent = count;
                        break;
                    case "delivered":
                        stats.delivered = count;
                        break;
                    case "opened":
                        stats.opened = count;
                        break;
                    case "clicked":
                        stats.clicked = count;
                        break;
                    case "bounced":
                        stats.bounced = count;
                        break;
                    case "failed":
                        stats.failed = count;
                        break;
                }
            }
            statsMap.set(campaign.id, stats);
        }
    }
    // Map campaigns to response format
    const mappedCampaigns = filteredCampaigns.map((campaign) => {
        const baseResponse = {
            id: campaign.id,
            name: campaign.name,
            subject: campaign.subject,
            emailFormat: campaign.emailFormat,
            delaySeconds: campaign.delaySeconds,
            status: campaign.status,
            selectedContactIds: campaign.selectedContactIds,
            aiPrompt: campaign.aiPrompt,
            createdAt: campaign.createdAt,
            sentAt: campaign.sentAt,
            sendStartHour: campaign.sendStartHour,
            sendEndHour: campaign.sendEndHour,
            sendDays: campaign.sendDays,
            timezone: campaign.timezone,
            contactCount: campaign.selectedContactIds.length,
            templateCount: campaign._count?.templates ?? 0,
        };
        // Add stats if requested
        if (filters.includeStats) {
            const stats = statsMap.get(campaign.id);
            if (stats) {
                const totalSent = stats.sent + stats.delivered + stats.opened + stats.clicked;
                baseResponse.stats = {
                    total: stats.total,
                    pending: stats.pending,
                    sent: stats.sent,
                    delivered: stats.delivered,
                    opened: stats.opened,
                    clicked: stats.clicked,
                    bounced: stats.bounced,
                    failed: stats.failed,
                    deliveryRate: totalSent > 0 ? Math.round((stats.delivered / totalSent) * 10000) / 100 : 0,
                    openRate: stats.delivered > 0 ? Math.round((stats.opened / stats.delivered) * 10000) / 100 : 0,
                    clickRate: stats.opened > 0 ? Math.round((stats.clicked / stats.opened) * 10000) / 100 : 0,
                    bounceRate: stats.total > 0 ? Math.round((stats.bounced / stats.total) * 10000) / 100 : 0,
                };
            }
        }
        return baseResponse;
    });
    return {
        campaigns: mappedCampaigns,
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + filteredCampaigns.length < total,
    };
}
// Register the tool
registerTool({
    name: "campaigns_list",
    description: "List campaigns with powerful filtering and search capabilities. Supports filtering by status, email format, AI-enabled campaigns, date ranges, and more. Includes pagination and optional email statistics.",
    inputSchema: {
        type: "object",
        properties: {
            search: {
                type: "string",
                description: "Search across campaign name and subject (partial match)",
            },
            status: {
                type: "string",
                enum: ["draft", "sending", "paused", "completed"],
                description: "Filter by single campaign status",
            },
            statuses: {
                type: "array",
                items: {
                    type: "string",
                    enum: ["draft", "sending", "paused", "completed"],
                },
                description: "Filter by multiple campaign statuses",
            },
            emailFormat: {
                type: "string",
                enum: ["html", "plain_text"],
                description: "Filter by email format",
            },
            hasAiPrompt: {
                type: "boolean",
                description: "Filter campaigns with AI prompt (true = has prompt, false = no prompt)",
            },
            hasContacts: {
                type: "boolean",
                description: "Filter campaigns with selected contacts (true = has contacts, false = no contacts)",
            },
            minContacts: {
                type: "number",
                description: "Minimum number of selected contacts",
            },
            maxContacts: {
                type: "number",
                description: "Maximum number of selected contacts",
            },
            createdAfter: {
                type: "string",
                description: "Filter campaigns created after this date (ISO 8601 format)",
            },
            createdBefore: {
                type: "string",
                description: "Filter campaigns created before this date (ISO 8601 format)",
            },
            sentAfter: {
                type: "string",
                description: "Filter campaigns sent after this date (ISO 8601 format)",
            },
            sentBefore: {
                type: "string",
                description: "Filter campaigns sent before this date (ISO 8601 format)",
            },
            sortBy: {
                type: "string",
                enum: ["createdAt", "sentAt", "name", "status"],
                description: "Field to sort by (default: createdAt)",
            },
            sortOrder: {
                type: "string",
                enum: ["asc", "desc"],
                description: "Sort direction (default: desc)",
            },
            includeStats: {
                type: "boolean",
                description: "Include email statistics (sent, delivered, opened, clicked, etc.) - default: false",
            },
            includeTemplates: {
                type: "boolean",
                description: "Include campaign templates in response - default: false",
            },
            limit: {
                type: "number",
                description: "Maximum number of campaigns to return (1-100, default: 20)",
            },
            offset: {
                type: "number",
                description: "Number of campaigns to skip for pagination (default: 0)",
            },
        },
        required: [],
    },
}, campaignsList);
/**
 * Get a single campaign by ID with templates and stats
 */
async function campaignsGet(args) {
    // Validate input
    const validation = validateCampaignGet(args);
    if (!validation.success) {
        throw new ValidationError("Invalid campaign get parameters", validation.errors);
    }
    const { id, includeTemplates, includeStats } = validation.data;
    // Fetch campaign with optional templates
    const campaign = await withDb(async () => {
        return prisma.campaign.findUnique({
            where: { id },
            include: {
                templates: includeTemplates
                    ? {
                        orderBy: { sortOrder: "asc" },
                    }
                    : false,
                _count: {
                    select: {
                        templates: true,
                        emails: true,
                    },
                },
            },
        });
    });
    // Return null if not found
    if (!campaign) {
        return null;
    }
    // Cast to proper type
    const typedCampaign = campaign;
    // Build base response
    const response = {
        id: typedCampaign.id,
        name: typedCampaign.name,
        subject: typedCampaign.subject,
        emailFormat: typedCampaign.emailFormat,
        delaySeconds: typedCampaign.delaySeconds,
        status: typedCampaign.status,
        selectedContactIds: typedCampaign.selectedContactIds,
        aiPrompt: typedCampaign.aiPrompt,
        createdAt: typedCampaign.createdAt,
        sentAt: typedCampaign.sentAt,
        sendStartHour: typedCampaign.sendStartHour,
        sendEndHour: typedCampaign.sendEndHour,
        sendDays: typedCampaign.sendDays,
        timezone: typedCampaign.timezone,
        contactCount: typedCampaign.selectedContactIds.length,
        templateCount: typedCampaign._count?.templates ?? 0,
    };
    // Add templates if requested
    if (includeTemplates && typedCampaign.templates) {
        response.templates = typedCampaign.templates.map((t) => ({
            id: t.id,
            campaignId: t.campaignId,
            versionName: t.versionName,
            body: t.body,
            sortOrder: t.sortOrder,
        }));
    }
    // Calculate stats if requested
    if (includeStats) {
        // Get email stats grouped by status
        const emailStats = await withDb(async () => {
            return prisma.campaignEmail.groupBy({
                by: ["status"],
                where: {
                    campaignId: id,
                },
                _count: true,
            });
        });
        // Initialize stats
        const stats = {
            campaignId: id,
            total: 0,
            pending: 0,
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            failed: 0,
        };
        // Process each status count
        for (const stat of emailStats) {
            const typedStat = stat;
            const count = typedStat._count;
            stats.total += count;
            switch (typedStat.status) {
                case "pending":
                    stats.pending = count;
                    break;
                case "sent":
                    stats.sent = count;
                    break;
                case "delivered":
                    stats.delivered = count;
                    break;
                case "opened":
                    stats.opened = count;
                    break;
                case "clicked":
                    stats.clicked = count;
                    break;
                case "bounced":
                    stats.bounced = count;
                    break;
                case "failed":
                    stats.failed = count;
                    break;
            }
        }
        // Calculate rates
        // For delivery rate, we count emails that moved beyond "sent" status
        const totalSent = stats.sent + stats.delivered + stats.opened + stats.clicked;
        const totalDelivered = stats.delivered + stats.opened + stats.clicked;
        response.stats = {
            total: stats.total,
            pending: stats.pending,
            sent: stats.sent,
            delivered: stats.delivered,
            opened: stats.opened,
            clicked: stats.clicked,
            bounced: stats.bounced,
            failed: stats.failed,
            // Delivery rate: delivered / (total sent excluding pending and failed)
            deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 10000) / 100 : 0,
            // Open rate: opened / delivered
            openRate: totalDelivered > 0
                ? Math.round((stats.opened / totalDelivered) * 10000) / 100
                : 0,
            // Click rate: clicked / opened
            clickRate: stats.opened > 0
                ? Math.round((stats.clicked / stats.opened) * 10000) / 100
                : 0,
            // Bounce rate: bounced / total
            bounceRate: stats.total > 0 ? Math.round((stats.bounced / stats.total) * 10000) / 100 : 0,
        };
    }
    return response;
}
// Register the campaigns_get tool
registerTool({
    name: "campaigns_get",
    description: "Get a single campaign by ID with full details. Includes campaign templates (sorted by sortOrder) and comprehensive email statistics (sent, delivered, opened, clicked, bounced counts and rates). Returns null if the campaign is not found.",
    inputSchema: {
        type: "object",
        properties: {
            id: {
                type: "string",
                description: "The UUID of the campaign to retrieve (required)",
            },
            includeTemplates: {
                type: "boolean",
                description: "Include campaign templates in response (default: true)",
            },
            includeStats: {
                type: "boolean",
                description: "Include email statistics (total, pending, sent, delivered, opened, clicked, bounced, failed, and calculated rates) - default: true",
            },
        },
        required: ["id"],
    },
}, campaignsGet);
// ============================================================================
// campaigns_create Tool
// ============================================================================
/**
 * Create a new campaign with validation
 */
async function campaignsCreate(args) {
    // Validate input using Zod schema
    const validation = validateCampaignCreate(args);
    if (!validation.success) {
        throw new ValidationError("Invalid campaign data", validation.errors);
    }
    const data = validation.data;
    // Validate timezone if provided (additional runtime check)
    if (data.timezone) {
        try {
            // Try to use the timezone - will throw if invalid
            Intl.DateTimeFormat(undefined, { timeZone: data.timezone });
        }
        catch {
            throw new ValidationError("Invalid timezone", {
                timezone: [`'${data.timezone}' is not a valid IANA timezone`],
            });
        }
    }
    // Validate sendDays array - ensure no duplicates
    if (data.sendDays) {
        const uniqueDays = new Set(data.sendDays);
        if (uniqueDays.size !== data.sendDays.length) {
            throw new ValidationError("Invalid sendDays", {
                sendDays: ["sendDays array cannot contain duplicate values"],
            });
        }
    }
    // Validate selectedContactIds exist if provided
    if (data.selectedContactIds && data.selectedContactIds.length > 0) {
        const existingContacts = await withDb(async () => {
            return prisma.contact.findMany({
                where: {
                    id: { in: data.selectedContactIds },
                },
                select: { id: true },
            });
        });
        const existingIds = new Set(existingContacts.map((c) => c.id));
        const missingIds = data.selectedContactIds.filter((id) => !existingIds.has(id));
        if (missingIds.length > 0) {
            throw new ValidationError("Invalid contact IDs", {
                selectedContactIds: [
                    `The following contact IDs do not exist: ${missingIds.slice(0, 5).join(", ")}${missingIds.length > 5 ? ` and ${missingIds.length - 5} more` : ""}`,
                ],
            });
        }
    }
    // Create the campaign with default status 'draft'
    const campaign = await withDb(async () => {
        return prisma.campaign.create({
            data: {
                name: data.name,
                subject: data.subject,
                emailFormat: data.emailFormat,
                delaySeconds: data.delaySeconds,
                status: "draft", // Always start as draft
                selectedContactIds: data.selectedContactIds || [],
                aiPrompt: data.aiPrompt || null,
                sendStartHour: data.sendStartHour ?? null,
                sendEndHour: data.sendEndHour ?? null,
                sendDays: data.sendDays || [1, 2, 3, 4, 5], // Default: Mon-Fri
                timezone: data.timezone || null,
            },
        });
    });
    // Return the created campaign
    return {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        emailFormat: campaign.emailFormat,
        delaySeconds: campaign.delaySeconds,
        status: campaign.status,
        selectedContactIds: campaign.selectedContactIds,
        aiPrompt: campaign.aiPrompt,
        createdAt: campaign.createdAt,
        sentAt: campaign.sentAt,
        sendStartHour: campaign.sendStartHour,
        sendEndHour: campaign.sendEndHour,
        sendDays: campaign.sendDays,
        timezone: campaign.timezone,
        contactCount: campaign.selectedContactIds.length,
        templateCount: 0, // New campaign has no templates yet
    };
}
// Register the campaigns_create tool
registerTool({
    name: "campaigns_create",
    description: "Create a new email campaign. The campaign starts in 'draft' status. You can optionally specify schedule settings, AI prompt for personalization, and pre-select contacts.",
    inputSchema: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "Campaign name (required, max 200 characters)",
            },
            subject: {
                type: "string",
                description: "Email subject line (required, max 500 characters)",
            },
            emailFormat: {
                type: "string",
                enum: ["html", "plain_text"],
                description: "Email format: 'html' or 'plain_text' (default: 'html')",
            },
            delaySeconds: {
                type: "number",
                description: "Delay between sends in seconds (0-3600, default: 0)",
            },
            sendStartHour: {
                type: "number",
                description: "Start hour for sending emails (0-23). Must be used with sendEndHour.",
            },
            sendEndHour: {
                type: "number",
                description: "End hour for sending emails (0-23). Must be used with sendStartHour.",
            },
            sendDays: {
                type: "array",
                items: {
                    type: "number",
                },
                description: "Days of week to send (0=Sunday, 1=Monday, ..., 6=Saturday). Default: [1,2,3,4,5] (Mon-Fri)",
            },
            timezone: {
                type: "string",
                description: "IANA timezone for scheduling (e.g., 'America/New_York', 'Europe/London', 'UTC')",
            },
            aiPrompt: {
                type: "string",
                description: "AI prompt for generating personalized email content per contact (max 10000 characters)",
            },
            selectedContactIds: {
                type: "array",
                items: {
                    type: "string",
                },
                description: "Array of contact IDs to include in campaign",
            },
        },
        required: ["name", "subject"],
    },
}, campaignsCreate);
// ============================================================================
// campaigns_update Tool
// ============================================================================
/**
 * Update an existing campaign with validation
 * - Validates partial input (all fields optional except id)
 * - Prevents updating completed campaigns
 * - Handles status transitions with validation
 * - Validates contact IDs if provided
 */
async function campaignsUpdate(args) {
    // Validate input using Zod schema
    const validation = validateCampaignUpdate(args);
    if (!validation.success) {
        throw new ValidationError("Invalid campaign update data", validation.errors);
    }
    const data = validation.data;
    const { id, ...updateFields } = data;
    // Check if campaign exists
    const existingCampaign = await withDb(async () => {
        return prisma.campaign.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        templates: true,
                    },
                },
            },
        });
    });
    if (!existingCampaign) {
        throw new ValidationError("Campaign not found", {
            id: [`Campaign with ID '${id}' does not exist`],
        });
    }
    // Prevent updating completed campaigns
    if (existingCampaign.status === "completed") {
        throw new ValidationError("Cannot update completed campaign", {
            status: [
                "Campaign is already completed and cannot be modified. Create a new campaign instead.",
            ],
        });
    }
    // Handle status transitions if status is being updated
    if (updateFields.status && updateFields.status !== existingCampaign.status) {
        const currentStatus = existingCampaign.status;
        const newStatus = updateFields.status;
        // Validate transition
        if (!isValidStatusTransition(currentStatus, newStatus)) {
            const validNextStatuses = getValidNextStatuses(currentStatus);
            throw new ValidationError("Invalid status transition", {
                status: [
                    `Cannot transition from '${currentStatus}' to '${newStatus}'. ` +
                        (validNextStatuses.length > 0
                            ? `Valid transitions from '${currentStatus}': ${validNextStatuses.join(", ")}`
                            : `No transitions allowed from '${currentStatus}'`),
                ],
            });
        }
    }
    // Validate timezone if provided
    if (updateFields.timezone) {
        try {
            // Try to use the timezone - will throw if invalid
            Intl.DateTimeFormat(undefined, { timeZone: updateFields.timezone });
        }
        catch {
            throw new ValidationError("Invalid timezone", {
                timezone: [`'${updateFields.timezone}' is not a valid IANA timezone`],
            });
        }
    }
    // Validate sendDays array - ensure no duplicates if provided
    if (updateFields.sendDays) {
        const uniqueDays = new Set(updateFields.sendDays);
        if (uniqueDays.size !== updateFields.sendDays.length) {
            throw new ValidationError("Invalid sendDays", {
                sendDays: ["sendDays array cannot contain duplicate values"],
            });
        }
    }
    // Validate hour consistency when updating schedule
    // If updating only one hour, check against existing value
    if (updateFields.sendStartHour !== undefined || updateFields.sendEndHour !== undefined) {
        const newStartHour = updateFields.sendStartHour !== undefined
            ? updateFields.sendStartHour
            : existingCampaign.sendStartHour;
        const newEndHour = updateFields.sendEndHour !== undefined
            ? updateFields.sendEndHour
            : existingCampaign.sendEndHour;
        // Both must be set or both must be null
        const startSet = newStartHour !== null && newStartHour !== undefined;
        const endSet = newEndHour !== null && newEndHour !== undefined;
        if (startSet !== endSet) {
            throw new ValidationError("Invalid schedule hours", {
                sendStartHour: [
                    "Both sendStartHour and sendEndHour must be set together, or both must be null",
                ],
            });
        }
        // Validate range if both are set
        if (startSet && endSet && newStartHour > newEndHour) {
            throw new ValidationError("Invalid schedule hours", {
                sendStartHour: ["sendStartHour must be less than or equal to sendEndHour"],
            });
        }
    }
    // Validate selectedContactIds exist if provided
    if (updateFields.selectedContactIds && updateFields.selectedContactIds.length > 0) {
        const existingContacts = await withDb(async () => {
            return prisma.contact.findMany({
                where: {
                    id: { in: updateFields.selectedContactIds },
                },
                select: { id: true },
            });
        });
        const existingIds = new Set(existingContacts.map((c) => c.id));
        const missingIds = updateFields.selectedContactIds.filter((cid) => !existingIds.has(cid));
        if (missingIds.length > 0) {
            throw new ValidationError("Invalid contact IDs", {
                selectedContactIds: [
                    `The following contact IDs do not exist: ${missingIds.slice(0, 5).join(", ")}${missingIds.length > 5 ? ` and ${missingIds.length - 5} more` : ""}`,
                ],
            });
        }
    }
    // Build update data object - only include provided fields
    const updateData = {};
    if (updateFields.name !== undefined) {
        updateData.name = updateFields.name;
    }
    if (updateFields.subject !== undefined) {
        updateData.subject = updateFields.subject;
    }
    if (updateFields.emailFormat !== undefined) {
        updateData.emailFormat = updateFields.emailFormat;
    }
    if (updateFields.delaySeconds !== undefined) {
        updateData.delaySeconds = updateFields.delaySeconds;
    }
    if (updateFields.status !== undefined) {
        updateData.status = updateFields.status;
        // Set sentAt when transitioning to 'sending'
        if (updateFields.status === "sending" && existingCampaign.status !== "sending") {
            updateData.sentAt = new Date();
        }
    }
    if (updateFields.sendStartHour !== undefined) {
        updateData.sendStartHour = updateFields.sendStartHour;
    }
    if (updateFields.sendEndHour !== undefined) {
        updateData.sendEndHour = updateFields.sendEndHour;
    }
    if (updateFields.sendDays !== undefined) {
        updateData.sendDays = updateFields.sendDays;
    }
    if (updateFields.timezone !== undefined) {
        updateData.timezone = updateFields.timezone;
    }
    if (updateFields.aiPrompt !== undefined) {
        updateData.aiPrompt = updateFields.aiPrompt;
    }
    if (updateFields.selectedContactIds !== undefined) {
        updateData.selectedContactIds = updateFields.selectedContactIds;
    }
    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
        // No fields to update - return existing campaign
        return {
            id: existingCampaign.id,
            name: existingCampaign.name,
            subject: existingCampaign.subject,
            emailFormat: existingCampaign.emailFormat,
            delaySeconds: existingCampaign.delaySeconds,
            status: existingCampaign.status,
            selectedContactIds: existingCampaign.selectedContactIds,
            aiPrompt: existingCampaign.aiPrompt,
            createdAt: existingCampaign.createdAt,
            sentAt: existingCampaign.sentAt,
            sendStartHour: existingCampaign.sendStartHour,
            sendEndHour: existingCampaign.sendEndHour,
            sendDays: existingCampaign.sendDays,
            timezone: existingCampaign.timezone,
            contactCount: existingCampaign.selectedContactIds.length,
            templateCount: existingCampaign._count?.templates ?? 0,
        };
    }
    // Update the campaign
    const updatedCampaign = await withDb(async () => {
        return prisma.campaign.update({
            where: { id },
            data: updateData,
            include: {
                _count: {
                    select: {
                        templates: true,
                    },
                },
            },
        });
    });
    // Return the updated campaign
    return {
        id: updatedCampaign.id,
        name: updatedCampaign.name,
        subject: updatedCampaign.subject,
        emailFormat: updatedCampaign.emailFormat,
        delaySeconds: updatedCampaign.delaySeconds,
        status: updatedCampaign.status,
        selectedContactIds: updatedCampaign.selectedContactIds,
        aiPrompt: updatedCampaign.aiPrompt,
        createdAt: updatedCampaign.createdAt,
        sentAt: updatedCampaign.sentAt,
        sendStartHour: updatedCampaign.sendStartHour,
        sendEndHour: updatedCampaign.sendEndHour,
        sendDays: updatedCampaign.sendDays,
        timezone: updatedCampaign.timezone,
        contactCount: updatedCampaign.selectedContactIds.length,
        templateCount: updatedCampaign._count?.templates ?? 0,
    };
}
// Register the campaigns_update tool
registerTool({
    name: "campaigns_update",
    description: "Update an existing campaign. All fields are optional except the campaign ID. " +
        "Cannot update completed campaigns. Status transitions are validated: " +
        "draft → sending, sending → paused/completed, paused → sending/draft. " +
        "If updating selectedContactIds, all IDs are validated to exist.",
    inputSchema: {
        type: "object",
        properties: {
            id: {
                type: "string",
                description: "The UUID of the campaign to update (required)",
            },
            name: {
                type: "string",
                description: "New campaign name (max 200 characters)",
            },
            subject: {
                type: "string",
                description: "New email subject line (max 500 characters)",
            },
            emailFormat: {
                type: "string",
                enum: ["html", "plain_text"],
                description: "New email format",
            },
            delaySeconds: {
                type: "number",
                description: "New delay between sends in seconds (0-3600)",
            },
            status: {
                type: "string",
                enum: ["draft", "sending", "paused", "completed"],
                description: "New campaign status. Valid transitions: draft→sending, sending→paused/completed, paused→sending/draft",
            },
            sendStartHour: {
                type: "number",
                description: "Start hour for sending emails (0-23). Use null to clear.",
            },
            sendEndHour: {
                type: "number",
                description: "End hour for sending emails (0-23). Use null to clear.",
            },
            sendDays: {
                type: "array",
                items: { type: "number" },
                description: "New days of week to send (0=Sunday, 1=Monday, ..., 6=Saturday)",
            },
            timezone: {
                type: "string",
                description: "New IANA timezone (e.g., 'America/New_York'). Use null to clear.",
            },
            aiPrompt: {
                type: "string",
                description: "New AI prompt for personalization (max 10000 characters). Use null to clear.",
            },
            selectedContactIds: {
                type: "array",
                items: { type: "string" },
                description: "Replace selected contact IDs with this new list. All IDs must exist.",
            },
        },
        required: ["id"],
    },
}, campaignsUpdate);
// ============================================================================
// campaigns_delete Tool
// ============================================================================
/**
 * Delete a campaign by ID
 * - Check campaign exists
 * - Prevent deleting active campaigns (status = "sending")
 * - Cascade delete templates and emails
 * - Return success with deletion counts
 */
async function campaignsDelete(args) {
    // Validate input
    const validation = validateCampaignDelete(args);
    if (!validation.success) {
        throw new ValidationError("Invalid campaign delete parameters", validation.errors);
    }
    const { id } = validation.data;
    // Check if campaign exists and get its status
    const campaign = await withDb(async () => {
        return prisma.campaign.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                name: true,
            },
        });
    });
    // Return error if campaign not found
    if (!campaign) {
        throw new ValidationError("Campaign not found", {
            id: [`Campaign with ID '${id}' does not exist`],
        });
    }
    // Prevent deleting active campaigns (status = "sending")
    if (campaign.status === "sending") {
        throw new ValidationError("Cannot delete active campaign", {
            status: [
                `Campaign '${campaign.name}' is currently sending. Pause or complete the campaign before deleting.`,
            ],
        });
    }
    // Delete campaign with cascade (templates and emails)
    // Prisma will cascade delete based on schema relations
    const result = await withDb(async () => {
        // First, count what will be deleted for the response
        const [templateCount, emailCount] = await Promise.all([
            prisma.campaignTemplate.count({ where: { campaignId: id } }),
            prisma.campaignEmail.count({ where: { campaignId: id } }),
        ]);
        // Delete in the correct order due to foreign key constraints
        // Delete emails first (they reference both campaign and template)
        await prisma.campaignEmail.deleteMany({ where: { campaignId: id } });
        // Delete templates
        await prisma.campaignTemplate.deleteMany({ where: { campaignId: id } });
        // Finally delete the campaign
        await prisma.campaign.delete({ where: { id } });
        return {
            deletedTemplates: templateCount,
            deletedEmails: emailCount,
        };
    });
    return {
        success: true,
        deletedId: id,
        deletedTemplates: result.deletedTemplates,
        deletedEmails: result.deletedEmails,
    };
}
// Register the campaigns_delete tool
registerTool({
    name: "campaigns_delete",
    description: "Delete a campaign by ID. This permanently removes the campaign along with all its templates and emails. Cannot delete campaigns that are currently sending - they must be paused or completed first.",
    inputSchema: {
        type: "object",
        properties: {
            id: {
                type: "string",
                description: "The UUID of the campaign to delete (required)",
            },
        },
        required: ["id"],
    },
}, campaignsDelete);
/**
 * Add contacts to a campaign
 * - Validate campaign exists and is draft
 * - Validate all contact IDs exist
 * - Add to selectedContactIds array
 * - Prevent duplicates
 * - Return total contacts count
 */
async function campaignsAddContacts(args) {
    // Validate input using Zod schema
    const validation = validateCampaignAddContacts(args);
    if (!validation.success) {
        throw new ValidationError("Invalid add contacts parameters", validation.errors);
    }
    const { campaignId, contactIds } = validation.data;
    // Check if campaign exists
    const campaign = await withDb(async () => {
        return prisma.campaign.findUnique({
            where: { id: campaignId },
            select: {
                id: true,
                status: true,
                name: true,
                selectedContactIds: true,
            },
        });
    });
    // Return error if campaign not found
    if (!campaign) {
        throw new ValidationError("Campaign not found", {
            campaignId: [`Campaign with ID '${campaignId}' does not exist`],
        });
    }
    // Check campaign is in draft status
    if (campaign.status !== "draft") {
        throw new ValidationError("Cannot modify contacts on non-draft campaign", {
            status: [
                `Campaign '${campaign.name}' is in '${campaign.status}' status. ` +
                    "Only draft campaigns can have contacts added. " +
                    (campaign.status === "sending"
                        ? "Pause the campaign first to modify contacts."
                        : campaign.status === "completed"
                            ? "Create a new campaign to send to additional contacts."
                            : "Change the campaign status to draft to modify contacts."),
            ],
        });
    }
    // Validate all contact IDs exist
    const existingContacts = await withDb(async () => {
        return prisma.contact.findMany({
            where: {
                id: { in: contactIds },
            },
            select: { id: true },
        });
    });
    const existingIds = new Set(existingContacts.map((c) => c.id));
    const missingIds = contactIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
        throw new ValidationError("Invalid contact IDs", {
            contactIds: [
                `The following contact IDs do not exist: ${missingIds.slice(0, 5).join(", ")}${missingIds.length > 5 ? ` and ${missingIds.length - 5} more` : ""}`,
            ],
        });
    }
    // Get current selected contacts as a Set for efficient lookup
    const currentContactIds = new Set(campaign.selectedContactIds);
    // Separate new contacts from already-selected (duplicates)
    const newContactIds = [];
    const skippedIds = [];
    for (const contactId of contactIds) {
        if (currentContactIds.has(contactId)) {
            skippedIds.push(contactId);
        }
        else {
            newContactIds.push(contactId);
            currentContactIds.add(contactId); // Add to set to prevent duplicates within the input
        }
    }
    // Update campaign with new contact IDs
    const updatedContactIds = [...campaign.selectedContactIds, ...newContactIds];
    await withDb(async () => {
        return prisma.campaign.update({
            where: { id: campaignId },
            data: {
                selectedContactIds: updatedContactIds,
            },
        });
    });
    return {
        campaignId,
        addedCount: newContactIds.length,
        skippedCount: skippedIds.length,
        totalContacts: updatedContactIds.length,
        skippedIds: skippedIds.slice(0, 10), // Only return first 10 skipped IDs
    };
}
// Register the campaigns_add_contacts tool
registerTool({
    name: "campaigns_add_contacts",
    description: "Add contacts to a campaign's selected contacts list. The campaign must be in 'draft' status. " +
        "Validates that all contact IDs exist. Automatically skips duplicate contacts that are already selected. " +
        "Returns the count of added/skipped contacts and the new total.",
    inputSchema: {
        type: "object",
        properties: {
            campaignId: {
                type: "string",
                description: "The UUID of the campaign to add contacts to (required)",
            },
            contactIds: {
                type: "array",
                items: {
                    type: "string",
                },
                description: "Array of contact UUIDs to add to the campaign (required, max 1000 contacts per call)",
            },
        },
        required: ["campaignId", "contactIds"],
    },
}, campaignsAddContacts);
export { campaignsList, campaignsGet, campaignsCreate, campaignsUpdate, campaignsDelete, campaignsAddContacts };
//# sourceMappingURL=campaigns.js.map