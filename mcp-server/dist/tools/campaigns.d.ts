/**
 * Campaign management MCP tools
 */
import { type CampaignListResponse, type CampaignFullResponse, type CampaignResponse, type CampaignDeleteResponse } from "../schemas/campaigns.js";
/**
 * List campaigns with filtering, searching, and pagination
 */
declare function campaignsList(args: Record<string, unknown>): Promise<CampaignListResponse>;
/**
 * Get a single campaign by ID with templates and stats
 */
declare function campaignsGet(args: Record<string, unknown>): Promise<CampaignFullResponse | null>;
/**
 * Create a new campaign with validation
 */
declare function campaignsCreate(args: Record<string, unknown>): Promise<CampaignResponse>;
/**
 * Update an existing campaign with validation
 * - Validates partial input (all fields optional except id)
 * - Prevents updating completed campaigns
 * - Handles status transitions with validation
 * - Validates contact IDs if provided
 */
declare function campaignsUpdate(args: Record<string, unknown>): Promise<CampaignResponse>;
/**
 * Delete a campaign by ID
 * - Check campaign exists
 * - Prevent deleting active campaigns (status = "sending")
 * - Cascade delete templates and emails
 * - Return success with deletion counts
 */
declare function campaignsDelete(args: Record<string, unknown>): Promise<CampaignDeleteResponse>;
/**
 * Response type for campaigns_add_contacts
 */
interface CampaignAddContactsResponse {
    campaignId: string;
    addedCount: number;
    skippedCount: number;
    totalContacts: number;
    skippedIds: string[];
}
/**
 * Add contacts to a campaign
 * - Validate campaign exists and is draft
 * - Validate all contact IDs exist
 * - Add to selectedContactIds array
 * - Prevent duplicates
 * - Return total contacts count
 */
declare function campaignsAddContacts(args: Record<string, unknown>): Promise<CampaignAddContactsResponse>;
export { campaignsList, campaignsGet, campaignsCreate, campaignsUpdate, campaignsDelete, campaignsAddContacts };
//# sourceMappingURL=campaigns.d.ts.map