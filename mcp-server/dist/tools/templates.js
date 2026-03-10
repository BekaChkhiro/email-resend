/**
 * Template management MCP tools
 */
import { registerTool } from "./index.js";
import { prisma, withDb } from "../utils/db.js";
import { ValidationError } from "../utils/errors.js";
import { validateTemplateListFilters, validateTemplateCreate, } from "../schemas/templates.js";
// ============================================================================
// templates_list Tool
// ============================================================================
/**
 * List templates for a campaign, ordered by sortOrder
 */
async function templatesList(args) {
    // Validate input
    const validation = validateTemplateListFilters(args);
    if (!validation.success) {
        throw new ValidationError("Invalid filter parameters", validation.errors);
    }
    const filters = validation.data;
    // Verify campaign exists
    const campaign = await withDb(async () => {
        return prisma.campaign.findUnique({
            where: { id: filters.campaignId },
            select: { id: true },
        });
    });
    if (!campaign) {
        throw new ValidationError("Campaign not found", {
            campaignId: [`Campaign with ID "${filters.campaignId}" does not exist`],
        });
    }
    // Build order by clause
    const orderBy = {
        [filters.sortBy]: filters.sortOrder,
    };
    // Execute query
    const templates = await withDb(async () => {
        return prisma.campaignTemplate.findMany({
            where: { campaignId: filters.campaignId },
            orderBy,
        });
    });
    return {
        templates: templates.map((template) => ({
            id: template.id,
            campaignId: template.campaignId,
            versionName: template.versionName,
            body: template.body,
            sortOrder: template.sortOrder,
        })),
        total: templates.length,
        campaignId: filters.campaignId,
    };
}
// Register the tool
registerTool({
    name: "templates_list",
    description: "List all templates for a specific campaign. Templates are email body variations used for A/B testing and rotation. Returns templates ordered by sortOrder by default.",
    inputSchema: {
        type: "object",
        properties: {
            campaignId: {
                type: "string",
                description: "The UUID of the campaign to get templates for (required)",
            },
            sortBy: {
                type: "string",
                enum: ["sortOrder", "versionName"],
                description: "Field to sort by (default: sortOrder)",
            },
            sortOrder: {
                type: "string",
                enum: ["asc", "desc"],
                description: "Sort direction (default: asc)",
            },
        },
        required: ["campaignId"],
    },
}, templatesList);
// ============================================================================
// templates_create Tool
// ============================================================================
/**
 * Create a new template for a campaign
 */
async function templatesCreate(args) {
    // Validate input
    const validation = validateTemplateCreate(args);
    if (!validation.success) {
        throw new ValidationError("Invalid template data", validation.errors);
    }
    const data = validation.data;
    // Verify campaign exists and is in draft status
    const campaign = await withDb(async () => {
        return prisma.campaign.findUnique({
            where: { id: data.campaignId },
            select: { id: true, name: true, status: true },
        });
    });
    if (!campaign) {
        throw new ValidationError("Campaign not found", {
            campaignId: [`Campaign with ID "${data.campaignId}" does not exist`],
        });
    }
    if (campaign.status !== "draft") {
        throw new ValidationError("Campaign is not editable", {
            campaignId: [`Cannot add templates to campaign with status "${campaign.status}". Campaign must be in "draft" status.`],
        });
    }
    // Auto-assign sortOrder if not provided
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
        const maxSortOrder = await withDb(async () => {
            const result = await prisma.campaignTemplate.aggregate({
                where: { campaignId: data.campaignId },
                _max: { sortOrder: true },
            });
            return result._max.sortOrder ?? -1;
        });
        sortOrder = maxSortOrder + 1;
    }
    // Create the template
    const template = await withDb(async () => {
        return prisma.campaignTemplate.create({
            data: {
                campaignId: data.campaignId,
                versionName: data.versionName,
                body: data.body,
                sortOrder,
            },
        });
    });
    return {
        template: {
            id: template.id,
            campaignId: template.campaignId,
            versionName: template.versionName,
            body: template.body,
            sortOrder: template.sortOrder,
        },
        message: `Template "${data.versionName}" created successfully for campaign "${campaign.name}"`,
    };
}
// Register the tool
registerTool({
    name: "templates_create",
    description: "Create a new email template for a campaign. Templates are email body variations used for A/B testing and round-robin rotation. Campaign must be in 'draft' status. Supports template variables: {{firstName}}, {{lastName}}, {{companyName}}, {{email}}.",
    inputSchema: {
        type: "object",
        properties: {
            campaignId: {
                type: "string",
                description: "The UUID of the campaign to create the template for (required)",
            },
            versionName: {
                type: "string",
                description: "Name for this template version (e.g., 'Version A', 'Professional', 'Casual') (required)",
            },
            body: {
                type: "string",
                description: "Email body content (HTML or plain text). Supports variables: {{firstName}}, {{lastName}}, {{companyName}}, {{email}} (required)",
            },
            sortOrder: {
                type: "number",
                description: "Sort order for template rotation (auto-assigned if not provided)",
            },
        },
        required: ["campaignId", "versionName", "body"],
    },
}, templatesCreate);
export { templatesList, templatesCreate };
//# sourceMappingURL=templates.js.map