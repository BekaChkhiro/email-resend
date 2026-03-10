/**
 * Zod schemas for Contact-related MCP tools
 */
import { z } from "zod";
import { PaginationSchema, EmailSchema, SortOrderSchema } from "./common.js";
// ============================================================================
// Field Schemas (reusable building blocks)
// ============================================================================
/**
 * Name fields with reasonable length limits
 */
const NameSchema = z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .trim();
const OptionalNameSchema = z
    .string()
    .max(100, "Name must be 100 characters or less")
    .trim()
    .optional()
    .nullable();
/**
 * Title/position field
 */
const TitleSchema = z
    .string()
    .max(200, "Title must be 200 characters or less")
    .trim()
    .optional()
    .nullable();
/**
 * URL validation for LinkedIn, profile URLs, etc.
 */
const OptionalUrlSchema = z
    .string()
    .max(500, "URL must be 500 characters or less")
    .optional()
    .nullable();
/**
 * Location fields
 */
const LocationSchema = z
    .string()
    .max(200, "Location must be 200 characters or less")
    .trim()
    .optional()
    .nullable();
/**
 * Company size (employee count)
 */
const CompanySizeSchema = z
    .number()
    .int("Company size must be a whole number")
    .min(0, "Company size cannot be negative")
    .max(10000000, "Company size seems unrealistic")
    .optional()
    .nullable();
/**
 * Year founded
 */
const CompanyFoundedSchema = z
    .number()
    .int("Year must be a whole number")
    .min(1800, "Company founded year must be after 1800")
    .max(new Date().getFullYear(), "Company founded year cannot be in the future")
    .optional()
    .nullable();
/**
 * Generic text field for descriptions, notes, etc.
 */
const TextFieldSchema = z
    .string()
    .max(5000, "Text must be 5000 characters or less")
    .trim()
    .optional()
    .nullable();
/**
 * Short text field for codes, types, etc.
 */
const ShortTextSchema = z
    .string()
    .max(100, "Text must be 100 characters or less")
    .trim()
    .optional()
    .nullable();
/**
 * Domain name validation
 */
const DomainNameSchema = z
    .string()
    .max(253, "Domain must be 253 characters or less")
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})$/, "Invalid domain format")
    .optional()
    .nullable();
// ============================================================================
// Contact Create Schema
// ============================================================================
/**
 * Schema for creating a new contact
 * Required: email, firstName, lastName
 * All other fields are optional
 */
export const ContactCreateSchema = z.object({
    // Required fields
    email: EmailSchema.describe("Contact's email address (required, must be unique)"),
    firstName: NameSchema.describe("Contact's first name (required)"),
    lastName: NameSchema.describe("Contact's last name (required)"),
    // Optional basic info
    fullName: OptionalNameSchema.describe("Full name (auto-generated if not provided)"),
    title: TitleSchema.describe("Job title or position"),
    // Email metadata
    listName: ShortTextSchema.describe("Name of the list this contact belongs to"),
    emailType: ShortTextSchema.describe("Type of email (work, personal, etc.)"),
    emailStatus: ShortTextSchema.describe("Email status (valid, invalid, etc.)"),
    // Location
    location: LocationSchema.describe("Full location string"),
    locality: LocationSchema.describe("City or locality"),
    region: LocationSchema.describe("State, province, or region"),
    country: LocationSchema.describe("Country name or code"),
    // Social / Profile
    linkedin: OptionalUrlSchema.describe("LinkedIn profile URL"),
    profileUrl: OptionalUrlSchema.describe("Other profile URL"),
    domain: DomainNameSchema.describe("Contact's personal domain"),
    // Company info
    companyName: z
        .string()
        .max(200, "Company name must be 200 characters or less")
        .trim()
        .optional()
        .nullable()
        .describe("Company name"),
    companyDomain: DomainNameSchema.describe("Company website domain"),
    companyIndustry: ShortTextSchema.describe("Primary industry"),
    companySubindustry: ShortTextSchema.describe("Sub-industry or specialization"),
    companySize: CompanySizeSchema.describe("Number of employees"),
    companySizeRange: ShortTextSchema.describe("Size range (e.g., '11-50', '51-200')"),
    companyFounded: CompanyFoundedSchema.describe("Year company was founded"),
    companyRevenue: ShortTextSchema.describe("Revenue range or amount"),
    companyFunding: ShortTextSchema.describe("Total funding amount"),
    companyType: ShortTextSchema.describe("Company type (public, private, etc.)"),
    companyLinkedin: OptionalUrlSchema.describe("Company LinkedIn page"),
    companyTwitter: OptionalUrlSchema.describe("Company Twitter/X profile"),
    companyFacebook: OptionalUrlSchema.describe("Company Facebook page"),
    companyDescription: TextFieldSchema.describe("Company description"),
    linkedinProfileUrl: OptionalUrlSchema.describe("LinkedIn profile URL (alternate)"),
    // Funding details
    companyLastFundingRound: ShortTextSchema.describe("Last funding round type (Series A, B, etc.)"),
    companyLastFundingAmount: ShortTextSchema.describe("Amount raised in last round"),
    companyLastFundingAt: ShortTextSchema.describe("Date of last funding round"),
    // Company address
    companyLocation: LocationSchema.describe("Company full address"),
    companyStreet: LocationSchema.describe("Company street address"),
    companyLocality: LocationSchema.describe("Company city"),
    companyRegion: LocationSchema.describe("Company state/province"),
    companyCountry: LocationSchema.describe("Company country"),
    companyPostalCode: z
        .string()
        .max(20, "Postal code must be 20 characters or less")
        .trim()
        .optional()
        .nullable()
        .describe("Company postal/ZIP code"),
    // Other
    otherWorkEmails: TextFieldSchema.describe("Other work email addresses (comma-separated)"),
    decisionMaker: z.boolean().optional().nullable().describe("Is this contact a decision maker?"),
});
// ============================================================================
// Contact Update Schema
// ============================================================================
/**
 * Schema for updating an existing contact
 * All fields are optional - only provided fields will be updated
 * Email updates will check for uniqueness
 */
export const ContactUpdateSchema = z.object({
    // ID of contact to update (required)
    id: z.string().uuid("Invalid contact ID format"),
    // All fields from create schema, but optional
    email: EmailSchema.optional().describe("New email address (must be unique)"),
    firstName: NameSchema.optional().describe("New first name"),
    lastName: NameSchema.optional().describe("New last name"),
    fullName: OptionalNameSchema.describe("New full name"),
    title: TitleSchema,
    // Email metadata
    listName: ShortTextSchema,
    emailType: ShortTextSchema,
    emailStatus: ShortTextSchema,
    // Location
    location: LocationSchema,
    locality: LocationSchema,
    region: LocationSchema,
    country: LocationSchema,
    // Social / Profile
    linkedin: OptionalUrlSchema,
    profileUrl: OptionalUrlSchema,
    domain: DomainNameSchema,
    // Company info
    companyName: z.string().max(200).trim().optional().nullable(),
    companyDomain: DomainNameSchema,
    companyIndustry: ShortTextSchema,
    companySubindustry: ShortTextSchema,
    companySize: CompanySizeSchema,
    companySizeRange: ShortTextSchema,
    companyFounded: CompanyFoundedSchema,
    companyRevenue: ShortTextSchema,
    companyFunding: ShortTextSchema,
    companyType: ShortTextSchema,
    companyLinkedin: OptionalUrlSchema,
    companyTwitter: OptionalUrlSchema,
    companyFacebook: OptionalUrlSchema,
    companyDescription: TextFieldSchema,
    linkedinProfileUrl: OptionalUrlSchema,
    // Funding details
    companyLastFundingRound: ShortTextSchema,
    companyLastFundingAmount: ShortTextSchema,
    companyLastFundingAt: ShortTextSchema,
    // Company address
    companyLocation: LocationSchema,
    companyStreet: LocationSchema,
    companyLocality: LocationSchema,
    companyRegion: LocationSchema,
    companyCountry: LocationSchema,
    companyPostalCode: z.string().max(20).trim().optional().nullable(),
    // Other
    otherWorkEmails: TextFieldSchema,
    decisionMaker: z.boolean().optional().nullable(),
    // Subscription status
    isUnsubscribed: z.boolean().optional().describe("Unsubscribe status"),
});
// ============================================================================
// Contact List Filters Schema
// ============================================================================
/**
 * Schema for filtering and searching contacts
 */
export const ContactListFiltersSchema = z
    .object({
    // Search across multiple fields
    search: z
        .string()
        .max(200, "Search query must be 200 characters or less")
        .trim()
        .optional()
        .describe("Search in email, name, and company name"),
    // Specific field filters
    email: z
        .string()
        .max(200)
        .trim()
        .optional()
        .describe("Filter by email (partial match)"),
    name: z
        .string()
        .max(200)
        .trim()
        .optional()
        .describe("Filter by first or last name (partial match)"),
    company: z
        .string()
        .max(200)
        .trim()
        .optional()
        .describe("Filter by company name (partial match)"),
    // Location filters
    country: z
        .string()
        .max(100)
        .trim()
        .optional()
        .describe("Filter by country"),
    region: z
        .string()
        .max(100)
        .trim()
        .optional()
        .describe("Filter by region/state"),
    locality: z
        .string()
        .max(100)
        .trim()
        .optional()
        .describe("Filter by city/locality"),
    // Company filters
    industry: z
        .string()
        .max(100)
        .trim()
        .optional()
        .describe("Filter by company industry"),
    companyType: z
        .string()
        .max(50)
        .trim()
        .optional()
        .describe("Filter by company type"),
    companySizeMin: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Minimum company size"),
    companySizeMax: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Maximum company size"),
    // Boolean filters
    isUnsubscribed: z
        .boolean()
        .optional()
        .describe("Filter by unsubscribe status"),
    decisionMaker: z
        .boolean()
        .optional()
        .describe("Filter by decision maker status"),
    hasCompany: z
        .boolean()
        .optional()
        .describe("Filter contacts with company info"),
    // List filter
    listName: z
        .string()
        .max(100)
        .trim()
        .optional()
        .describe("Filter by list name"),
    // Sorting
    sortBy: z
        .enum(["createdAt", "email", "firstName", "lastName", "companyName"])
        .default("createdAt")
        .describe("Field to sort by"),
    sortOrder: SortOrderSchema.describe("Sort direction (asc or desc)"),
    // Date filters
    createdAfter: z.coerce
        .date()
        .optional()
        .describe("Filter contacts created after this date"),
    createdBefore: z.coerce
        .date()
        .optional()
        .describe("Filter contacts created before this date"),
})
    .merge(PaginationSchema)
    .refine((data) => {
    // Validate company size range
    if (data.companySizeMin !== undefined &&
        data.companySizeMax !== undefined &&
        data.companySizeMin > data.companySizeMax) {
        return false;
    }
    return true;
}, {
    message: "companySizeMin cannot be greater than companySizeMax",
    path: ["companySizeMin"],
})
    .refine((data) => {
    // Validate date range
    if (data.createdAfter !== undefined &&
        data.createdBefore !== undefined &&
        data.createdAfter > data.createdBefore) {
        return false;
    }
    return true;
}, {
    message: "createdAfter cannot be after createdBefore",
    path: ["createdAfter"],
});
// ============================================================================
// Bulk Create Schema
// ============================================================================
/**
 * Schema for bulk creating contacts
 */
export const ContactBulkCreateSchema = z.object({
    contacts: z
        .array(ContactCreateSchema)
        .min(1, "At least one contact is required")
        .max(100, "Maximum 100 contacts per batch"),
    skipDuplicates: z
        .boolean()
        .default(false)
        .describe("Skip contacts with duplicate emails instead of failing"),
});
// ============================================================================
// Response Types
// ============================================================================
/**
 * Contact response shape (what we return from the API)
 */
export const ContactResponseSchema = z.object({
    id: z.string().uuid(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    fullName: z.string().nullable(),
    title: z.string().nullable(),
    listName: z.string().nullable(),
    emailType: z.string().nullable(),
    emailStatus: z.string().nullable(),
    location: z.string().nullable(),
    locality: z.string().nullable(),
    region: z.string().nullable(),
    country: z.string().nullable(),
    linkedin: z.string().nullable(),
    profileUrl: z.string().nullable(),
    domain: z.string().nullable(),
    companyName: z.string().nullable(),
    companyDomain: z.string().nullable(),
    companyIndustry: z.string().nullable(),
    companySubindustry: z.string().nullable(),
    companySize: z.number().nullable(),
    companySizeRange: z.string().nullable(),
    companyFounded: z.number().nullable(),
    companyRevenue: z.string().nullable(),
    companyFunding: z.string().nullable(),
    companyType: z.string().nullable(),
    companyLinkedin: z.string().nullable(),
    companyTwitter: z.string().nullable(),
    companyFacebook: z.string().nullable(),
    companyDescription: z.string().nullable(),
    linkedinProfileUrl: z.string().nullable(),
    companyLastFundingRound: z.string().nullable(),
    companyLastFundingAmount: z.string().nullable(),
    companyLastFundingAt: z.string().nullable(),
    companyLocation: z.string().nullable(),
    companyStreet: z.string().nullable(),
    companyLocality: z.string().nullable(),
    companyRegion: z.string().nullable(),
    companyCountry: z.string().nullable(),
    companyPostalCode: z.string().nullable(),
    otherWorkEmails: z.string().nullable(),
    decisionMaker: z.boolean().nullable(),
    isUnsubscribed: z.boolean(),
    createdAt: z.coerce.date(),
});
/**
 * List response with pagination metadata
 */
export const ContactListResponseSchema = z.object({
    contacts: z.array(ContactResponseSchema),
    total: z.number().int().min(0),
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    hasMore: z.boolean(),
});
/**
 * Bulk create response
 */
export const ContactBulkCreateResponseSchema = z.object({
    created: z.number().int().min(0).describe("Number of contacts created"),
    skipped: z.number().int().min(0).describe("Number of duplicates skipped"),
    errors: z
        .array(z.object({
        index: z.number().int().describe("Index in the input array"),
        email: z.string().describe("Email that failed"),
        message: z.string().describe("Error message"),
    }))
        .describe("List of errors for failed contacts"),
});
// ============================================================================
// Validation Helper
// ============================================================================
/**
 * Validate contact create input and return parsed data or errors
 */
export function validateContactCreate(input) {
    const result = ContactCreateSchema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    const errors = {};
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
 * Validate contact update input and return parsed data or errors
 */
export function validateContactUpdate(input) {
    const result = ContactUpdateSchema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    const errors = {};
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
 * Validate list filters and return parsed data or errors
 */
export function validateContactListFilters(input) {
    const result = ContactListFiltersSchema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    const errors = {};
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
 * Validate bulk create input and return parsed data or errors
 */
export function validateContactBulkCreate(input) {
    const result = ContactBulkCreateSchema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    const errors = {};
    for (const issue of result.error.issues) {
        const path = issue.path.join(".") || "_root";
        if (!errors[path]) {
            errors[path] = [];
        }
        errors[path].push(issue.message);
    }
    return { success: false, errors };
}
//# sourceMappingURL=contacts.js.map