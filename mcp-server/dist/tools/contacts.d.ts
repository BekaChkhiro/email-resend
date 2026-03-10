/**
 * Contact management MCP tools
 */
import { type ContactListResponse, type ContactResponse, type ContactBulkCreateResponse } from "../schemas/contacts.js";
/**
 * List contacts with filtering, searching, and pagination
 */
declare function contactsList(args: Record<string, unknown>): Promise<ContactListResponse>;
/**
 * Response type for contacts_get including campaign email stats
 */
interface ContactGetResponse extends ContactResponse {
    campaignEmailsCount: number;
}
/**
 * Get a single contact by ID with campaign email count
 */
declare function contactsGet(args: Record<string, unknown>): Promise<ContactGetResponse | null>;
/**
 * Create a new contact
 */
declare function contactsCreate(args: Record<string, unknown>): Promise<ContactResponse>;
/**
 * Update an existing contact
 */
declare function contactsUpdate(args: Record<string, unknown>): Promise<ContactResponse>;
/**
 * Response type for contacts_delete
 */
interface ContactDeleteResponse {
    success: boolean;
    id: string;
    email: string;
    deletedCampaignEmails: number;
    message: string;
}
/**
 * Delete a contact by ID
 */
declare function contactsDelete(args: Record<string, unknown>): Promise<ContactDeleteResponse>;
/**
 * Bulk create contacts with transaction support
 */
declare function contactsBulkCreate(args: Record<string, unknown>): Promise<ContactBulkCreateResponse>;
export { contactsList, contactsGet, contactsCreate, contactsUpdate, contactsDelete, contactsBulkCreate };
//# sourceMappingURL=contacts.d.ts.map