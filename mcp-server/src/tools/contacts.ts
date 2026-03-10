/**
 * Contact management MCP tools
 */

import { registerTool } from "./index.js";
import { prisma, withDb } from "../utils/db.js";
import { ValidationError } from "../utils/errors.js";
import {
  validateContactListFilters,
  validateContactCreate,
  validateContactUpdate,
  validateContactBulkCreate,
  type ContactListResponse,
  type ContactResponse,
  type ContactBulkCreateResponse,
} from "../schemas/contacts.js";

// ============================================================================
// contacts_list Tool
// ============================================================================

/**
 * List contacts with filtering, searching, and pagination
 */
async function contactsList(args: Record<string, unknown>): Promise<ContactListResponse> {
  // Validate input
  const validation = validateContactListFilters(args);
  if (!validation.success) {
    throw new ValidationError("Invalid filter parameters", validation.errors);
  }

  const filters = validation.data!;

  // Build where clause
  const where: Record<string, unknown> = {};
  const andConditions: Record<string, unknown>[] = [];

  // Global search across email, name, and company
  if (filters.search) {
    where.OR = [
      { email: { contains: filters.search, mode: "insensitive" } },
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { companyName: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Specific field filters
  if (filters.email) {
    andConditions.push({
      email: { contains: filters.email, mode: "insensitive" },
    });
  }

  if (filters.name) {
    andConditions.push({
      OR: [
        { firstName: { contains: filters.name, mode: "insensitive" } },
        { lastName: { contains: filters.name, mode: "insensitive" } },
        { fullName: { contains: filters.name, mode: "insensitive" } },
      ],
    });
  }

  if (filters.company) {
    andConditions.push({
      companyName: { contains: filters.company, mode: "insensitive" },
    });
  }

  // Location filters
  if (filters.country) {
    andConditions.push({
      country: { contains: filters.country, mode: "insensitive" },
    });
  }

  if (filters.region) {
    andConditions.push({
      region: { contains: filters.region, mode: "insensitive" },
    });
  }

  if (filters.locality) {
    andConditions.push({
      locality: { contains: filters.locality, mode: "insensitive" },
    });
  }

  // Company filters
  if (filters.industry) {
    andConditions.push({
      companyIndustry: { contains: filters.industry, mode: "insensitive" },
    });
  }

  if (filters.companyType) {
    andConditions.push({
      companyType: { contains: filters.companyType, mode: "insensitive" },
    });
  }

  // Company size range
  if (filters.companySizeMin !== undefined) {
    andConditions.push({
      companySize: { gte: filters.companySizeMin },
    });
  }

  if (filters.companySizeMax !== undefined) {
    andConditions.push({
      companySize: { lte: filters.companySizeMax },
    });
  }

  // Boolean filters
  if (filters.isUnsubscribed !== undefined) {
    andConditions.push({
      isUnsubscribed: filters.isUnsubscribed,
    });
  }

  if (filters.decisionMaker !== undefined) {
    andConditions.push({
      decisionMaker: filters.decisionMaker,
    });
  }

  if (filters.hasCompany !== undefined) {
    if (filters.hasCompany) {
      andConditions.push({
        companyName: { not: null },
      });
    } else {
      andConditions.push({
        companyName: null,
      });
    }
  }

  // List filter
  if (filters.listName) {
    andConditions.push({
      listName: { contains: filters.listName, mode: "insensitive" },
    });
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

  // Add AND conditions if any exist
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  // Build order by clause
  const orderBy = {
    [filters.sortBy]: filters.sortOrder,
  };

  // Execute queries
  const [contacts, total] = await withDb(async () => {
    return Promise.all([
      prisma.contact.findMany({
        where,
        orderBy,
        skip: filters.offset,
        take: filters.limit,
      }),
      prisma.contact.count({ where }),
    ]);
  });

  return {
    contacts: contacts.map((contact: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      fullName: string | null;
      title: string | null;
      listName: string | null;
      emailType: string | null;
      emailStatus: string | null;
      location: string | null;
      locality: string | null;
      region: string | null;
      country: string | null;
      linkedin: string | null;
      profileUrl: string | null;
      domain: string | null;
      companyName: string | null;
      companyDomain: string | null;
      companyIndustry: string | null;
      companySubindustry: string | null;
      companySize: number | null;
      companySizeRange: string | null;
      companyFounded: number | null;
      companyRevenue: string | null;
      companyFunding: string | null;
      companyType: string | null;
      companyLinkedin: string | null;
      companyTwitter: string | null;
      companyFacebook: string | null;
      companyDescription: string | null;
      linkedinProfileUrl: string | null;
      companyLastFundingRound: string | null;
      companyLastFundingAmount: string | null;
      companyLastFundingAt: string | null;
      companyLocation: string | null;
      companyStreet: string | null;
      companyLocality: string | null;
      companyRegion: string | null;
      companyCountry: string | null;
      companyPostalCode: string | null;
      otherWorkEmails: string | null;
      decisionMaker: boolean | null;
      isUnsubscribed: boolean;
      createdAt: Date;
    }) => ({
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      fullName: contact.fullName,
      title: contact.title,
      listName: contact.listName,
      emailType: contact.emailType,
      emailStatus: contact.emailStatus,
      location: contact.location,
      locality: contact.locality,
      region: contact.region,
      country: contact.country,
      linkedin: contact.linkedin,
      profileUrl: contact.profileUrl,
      domain: contact.domain,
      companyName: contact.companyName,
      companyDomain: contact.companyDomain,
      companyIndustry: contact.companyIndustry,
      companySubindustry: contact.companySubindustry,
      companySize: contact.companySize,
      companySizeRange: contact.companySizeRange,
      companyFounded: contact.companyFounded,
      companyRevenue: contact.companyRevenue,
      companyFunding: contact.companyFunding,
      companyType: contact.companyType,
      companyLinkedin: contact.companyLinkedin,
      companyTwitter: contact.companyTwitter,
      companyFacebook: contact.companyFacebook,
      companyDescription: contact.companyDescription,
      linkedinProfileUrl: contact.linkedinProfileUrl,
      companyLastFundingRound: contact.companyLastFundingRound,
      companyLastFundingAmount: contact.companyLastFundingAmount,
      companyLastFundingAt: contact.companyLastFundingAt,
      companyLocation: contact.companyLocation,
      companyStreet: contact.companyStreet,
      companyLocality: contact.companyLocality,
      companyRegion: contact.companyRegion,
      companyCountry: contact.companyCountry,
      companyPostalCode: contact.companyPostalCode,
      otherWorkEmails: contact.otherWorkEmails,
      decisionMaker: contact.decisionMaker,
      isUnsubscribed: contact.isUnsubscribed,
      createdAt: contact.createdAt,
    })),
    total,
    limit: filters.limit,
    offset: filters.offset,
    hasMore: filters.offset + contacts.length < total,
  };
}

// Register the tool
registerTool(
  {
    name: "contacts_list",
    description:
      "List contacts with powerful filtering and search capabilities. Supports searching by email, name, company, location, industry, and more. Includes pagination for large contact lists.",
    inputSchema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Search across email, name, and company name (partial match)",
        },
        email: {
          type: "string",
          description: "Filter by email address (partial match)",
        },
        name: {
          type: "string",
          description: "Filter by first name, last name, or full name (partial match)",
        },
        company: {
          type: "string",
          description: "Filter by company name (partial match)",
        },
        country: {
          type: "string",
          description: "Filter by country (partial match)",
        },
        region: {
          type: "string",
          description: "Filter by region/state (partial match)",
        },
        locality: {
          type: "string",
          description: "Filter by city/locality (partial match)",
        },
        industry: {
          type: "string",
          description: "Filter by company industry (partial match)",
        },
        companyType: {
          type: "string",
          description: "Filter by company type (e.g., 'public', 'private', 'startup')",
        },
        companySizeMin: {
          type: "number",
          description: "Minimum company size (employee count)",
        },
        companySizeMax: {
          type: "number",
          description: "Maximum company size (employee count)",
        },
        isUnsubscribed: {
          type: "boolean",
          description: "Filter by unsubscribe status (true = unsubscribed only, false = subscribed only)",
        },
        decisionMaker: {
          type: "boolean",
          description: "Filter by decision maker status",
        },
        hasCompany: {
          type: "boolean",
          description: "Filter contacts with/without company info (true = has company, false = no company)",
        },
        listName: {
          type: "string",
          description: "Filter by list name (partial match)",
        },
        createdAfter: {
          type: "string",
          description: "Filter contacts created after this date (ISO 8601 format)",
        },
        createdBefore: {
          type: "string",
          description: "Filter contacts created before this date (ISO 8601 format)",
        },
        sortBy: {
          type: "string",
          enum: ["createdAt", "email", "firstName", "lastName", "companyName"],
          description: "Field to sort by (default: createdAt)",
        },
        sortOrder: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Sort direction (default: desc)",
        },
        limit: {
          type: "number",
          description: "Maximum number of contacts to return (1-100, default: 20)",
        },
        offset: {
          type: "number",
          description: "Number of contacts to skip for pagination (default: 0)",
        },
      },
      required: [],
    },
  },
  contactsList
);

// ============================================================================
// contacts_get Tool
// ============================================================================

/**
 * Response type for contacts_get including campaign email stats
 */
interface ContactGetResponse extends ContactResponse {
  campaignEmailsCount: number;
}

/**
 * Get a single contact by ID with campaign email count
 */
async function contactsGet(args: Record<string, unknown>): Promise<ContactGetResponse | null> {
  const id = args.id;

  // Validate ID is provided and is a string
  if (!id || typeof id !== "string") {
    throw new ValidationError("Contact ID is required", {
      id: ["Contact ID must be a valid UUID string"],
    });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new ValidationError("Invalid contact ID format", {
      id: ["Contact ID must be a valid UUID"],
    });
  }

  // Fetch contact with campaign email count
  const result = await withDb(async () => {
    const contact = await prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      return null;
    }

    // Count campaign emails for this contact
    const campaignEmailsCount = await prisma.campaignEmail.count({
      where: { contactId: id },
    });

    return { contact, campaignEmailsCount };
  });

  if (!result) {
    return null;
  }

  const { contact, campaignEmailsCount } = result;

  return {
    id: contact.id,
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    fullName: contact.fullName,
    title: contact.title,
    listName: contact.listName,
    emailType: contact.emailType,
    emailStatus: contact.emailStatus,
    location: contact.location,
    locality: contact.locality,
    region: contact.region,
    country: contact.country,
    linkedin: contact.linkedin,
    profileUrl: contact.profileUrl,
    domain: contact.domain,
    companyName: contact.companyName,
    companyDomain: contact.companyDomain,
    companyIndustry: contact.companyIndustry,
    companySubindustry: contact.companySubindustry,
    companySize: contact.companySize,
    companySizeRange: contact.companySizeRange,
    companyFounded: contact.companyFounded,
    companyRevenue: contact.companyRevenue,
    companyFunding: contact.companyFunding,
    companyType: contact.companyType,
    companyLinkedin: contact.companyLinkedin,
    companyTwitter: contact.companyTwitter,
    companyFacebook: contact.companyFacebook,
    companyDescription: contact.companyDescription,
    linkedinProfileUrl: contact.linkedinProfileUrl,
    companyLastFundingRound: contact.companyLastFundingRound,
    companyLastFundingAmount: contact.companyLastFundingAmount,
    companyLastFundingAt: contact.companyLastFundingAt,
    companyLocation: contact.companyLocation,
    companyStreet: contact.companyStreet,
    companyLocality: contact.companyLocality,
    companyRegion: contact.companyRegion,
    companyCountry: contact.companyCountry,
    companyPostalCode: contact.companyPostalCode,
    otherWorkEmails: contact.otherWorkEmails,
    decisionMaker: contact.decisionMaker,
    isUnsubscribed: contact.isUnsubscribed,
    createdAt: contact.createdAt,
    campaignEmailsCount,
  };
}

// Register the contacts_get tool
registerTool(
  {
    name: "contacts_get",
    description:
      "Get a single contact by ID. Returns full contact details including the count of campaign emails sent to this contact. Returns null if the contact is not found.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The UUID of the contact to retrieve",
        },
      },
      required: ["id"],
    },
  },
  contactsGet
);

// ============================================================================
// contacts_create Tool
// ============================================================================

/**
 * Custom error for duplicate email
 */
class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`A contact with email "${email}" already exists`);
    this.name = "DuplicateEmailError";
  }
}

/**
 * Create a new contact
 */
async function contactsCreate(args: Record<string, unknown>): Promise<ContactResponse> {
  // Validate input using Zod schema
  const validation = validateContactCreate(args);
  if (!validation.success) {
    throw new ValidationError("Invalid contact data", validation.errors);
  }

  const data = validation.data!;

  // Check for duplicate email
  const existingContact = await withDb(async () => {
    return prisma.contact.findUnique({
      where: { email: data.email.toLowerCase() },
      select: { id: true },
    });
  });

  if (existingContact) {
    throw new DuplicateEmailError(data.email);
  }

  // Auto-generate fullName if not provided
  const fullName = data.fullName || `${data.firstName} ${data.lastName}`;

  // Create the contact
  const contact = await withDb(async () => {
    return prisma.contact.create({
      data: {
        email: data.email.toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        fullName,
        title: data.title ?? null,
        listName: data.listName ?? null,
        emailType: data.emailType ?? null,
        emailStatus: data.emailStatus ?? null,
        location: data.location ?? null,
        locality: data.locality ?? null,
        region: data.region ?? null,
        country: data.country ?? null,
        linkedin: data.linkedin ?? null,
        profileUrl: data.profileUrl ?? null,
        domain: data.domain ?? null,
        companyName: data.companyName ?? null,
        companyDomain: data.companyDomain ?? null,
        companyIndustry: data.companyIndustry ?? null,
        companySubindustry: data.companySubindustry ?? null,
        companySize: data.companySize ?? null,
        companySizeRange: data.companySizeRange ?? null,
        companyFounded: data.companyFounded ?? null,
        companyRevenue: data.companyRevenue ?? null,
        companyFunding: data.companyFunding ?? null,
        companyType: data.companyType ?? null,
        companyLinkedin: data.companyLinkedin ?? null,
        companyTwitter: data.companyTwitter ?? null,
        companyFacebook: data.companyFacebook ?? null,
        companyDescription: data.companyDescription ?? null,
        linkedinProfileUrl: data.linkedinProfileUrl ?? null,
        companyLastFundingRound: data.companyLastFundingRound ?? null,
        companyLastFundingAmount: data.companyLastFundingAmount ?? null,
        companyLastFundingAt: data.companyLastFundingAt ?? null,
        companyLocation: data.companyLocation ?? null,
        companyStreet: data.companyStreet ?? null,
        companyLocality: data.companyLocality ?? null,
        companyRegion: data.companyRegion ?? null,
        companyCountry: data.companyCountry ?? null,
        companyPostalCode: data.companyPostalCode ?? null,
        otherWorkEmails: data.otherWorkEmails ?? null,
        decisionMaker: data.decisionMaker ?? null,
        isUnsubscribed: false,
      },
    });
  });

  return {
    id: contact.id,
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    fullName: contact.fullName,
    title: contact.title,
    listName: contact.listName,
    emailType: contact.emailType,
    emailStatus: contact.emailStatus,
    location: contact.location,
    locality: contact.locality,
    region: contact.region,
    country: contact.country,
    linkedin: contact.linkedin,
    profileUrl: contact.profileUrl,
    domain: contact.domain,
    companyName: contact.companyName,
    companyDomain: contact.companyDomain,
    companyIndustry: contact.companyIndustry,
    companySubindustry: contact.companySubindustry,
    companySize: contact.companySize,
    companySizeRange: contact.companySizeRange,
    companyFounded: contact.companyFounded,
    companyRevenue: contact.companyRevenue,
    companyFunding: contact.companyFunding,
    companyType: contact.companyType,
    companyLinkedin: contact.companyLinkedin,
    companyTwitter: contact.companyTwitter,
    companyFacebook: contact.companyFacebook,
    companyDescription: contact.companyDescription,
    linkedinProfileUrl: contact.linkedinProfileUrl,
    companyLastFundingRound: contact.companyLastFundingRound,
    companyLastFundingAmount: contact.companyLastFundingAmount,
    companyLastFundingAt: contact.companyLastFundingAt,
    companyLocation: contact.companyLocation,
    companyStreet: contact.companyStreet,
    companyLocality: contact.companyLocality,
    companyRegion: contact.companyRegion,
    companyCountry: contact.companyCountry,
    companyPostalCode: contact.companyPostalCode,
    otherWorkEmails: contact.otherWorkEmails,
    decisionMaker: contact.decisionMaker,
    isUnsubscribed: contact.isUnsubscribed,
    createdAt: contact.createdAt,
  };
}

// Register the contacts_create tool
registerTool(
  {
    name: "contacts_create",
    description:
      "Create a new contact. Requires email, firstName, and lastName. All other fields are optional. Returns the created contact or an error if the email already exists.",
    inputSchema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "Contact's email address (required, must be unique)",
        },
        firstName: {
          type: "string",
          description: "Contact's first name (required)",
        },
        lastName: {
          type: "string",
          description: "Contact's last name (required)",
        },
        fullName: {
          type: "string",
          description: "Full name (auto-generated from firstName + lastName if not provided)",
        },
        title: {
          type: "string",
          description: "Job title or position",
        },
        listName: {
          type: "string",
          description: "Name of the list this contact belongs to",
        },
        emailType: {
          type: "string",
          description: "Type of email (work, personal, etc.)",
        },
        emailStatus: {
          type: "string",
          description: "Email status (valid, invalid, etc.)",
        },
        location: {
          type: "string",
          description: "Full location string",
        },
        locality: {
          type: "string",
          description: "City or locality",
        },
        region: {
          type: "string",
          description: "State, province, or region",
        },
        country: {
          type: "string",
          description: "Country name or code",
        },
        linkedin: {
          type: "string",
          description: "LinkedIn profile URL",
        },
        profileUrl: {
          type: "string",
          description: "Other profile URL",
        },
        domain: {
          type: "string",
          description: "Contact's personal domain",
        },
        companyName: {
          type: "string",
          description: "Company name",
        },
        companyDomain: {
          type: "string",
          description: "Company website domain",
        },
        companyIndustry: {
          type: "string",
          description: "Primary industry",
        },
        companySubindustry: {
          type: "string",
          description: "Sub-industry or specialization",
        },
        companySize: {
          type: "number",
          description: "Number of employees",
        },
        companySizeRange: {
          type: "string",
          description: "Size range (e.g., '11-50', '51-200')",
        },
        companyFounded: {
          type: "number",
          description: "Year company was founded",
        },
        companyRevenue: {
          type: "string",
          description: "Revenue range or amount",
        },
        companyFunding: {
          type: "string",
          description: "Total funding amount",
        },
        companyType: {
          type: "string",
          description: "Company type (public, private, etc.)",
        },
        companyLinkedin: {
          type: "string",
          description: "Company LinkedIn page",
        },
        companyTwitter: {
          type: "string",
          description: "Company Twitter/X profile",
        },
        companyFacebook: {
          type: "string",
          description: "Company Facebook page",
        },
        companyDescription: {
          type: "string",
          description: "Company description",
        },
        linkedinProfileUrl: {
          type: "string",
          description: "LinkedIn profile URL (alternate)",
        },
        companyLastFundingRound: {
          type: "string",
          description: "Last funding round type (Series A, B, etc.)",
        },
        companyLastFundingAmount: {
          type: "string",
          description: "Amount raised in last round",
        },
        companyLastFundingAt: {
          type: "string",
          description: "Date of last funding round",
        },
        companyLocation: {
          type: "string",
          description: "Company full address",
        },
        companyStreet: {
          type: "string",
          description: "Company street address",
        },
        companyLocality: {
          type: "string",
          description: "Company city",
        },
        companyRegion: {
          type: "string",
          description: "Company state/province",
        },
        companyCountry: {
          type: "string",
          description: "Company country",
        },
        companyPostalCode: {
          type: "string",
          description: "Company postal/ZIP code",
        },
        otherWorkEmails: {
          type: "string",
          description: "Other work email addresses (comma-separated)",
        },
        decisionMaker: {
          type: "boolean",
          description: "Is this contact a decision maker?",
        },
      },
      required: ["email", "firstName", "lastName"],
    },
  },
  contactsCreate
);

// ============================================================================
// contacts_update Tool
// ============================================================================

/**
 * Custom error for contact not found
 */
class ContactNotFoundError extends Error {
  constructor(id: string) {
    super(`Contact with ID "${id}" not found`);
    this.name = "ContactNotFoundError";
  }
}

/**
 * Update an existing contact
 */
async function contactsUpdate(args: Record<string, unknown>): Promise<ContactResponse> {
  // Validate input using Zod schema
  const validation = validateContactUpdate(args);
  if (!validation.success) {
    throw new ValidationError("Invalid contact update data", validation.errors);
  }

  const { id, ...updateData } = validation.data!;

  // Check that contact exists
  const existingContact = await withDb(async () => {
    return prisma.contact.findUnique({
      where: { id },
      select: { id: true, email: true },
    });
  });

  if (!existingContact) {
    throw new ContactNotFoundError(id);
  }

  // If email is being updated, check for duplicates
  if (updateData.email && updateData.email.toLowerCase() !== existingContact.email.toLowerCase()) {
    const duplicateEmail = await withDb(async () => {
      return prisma.contact.findUnique({
        where: { email: updateData.email!.toLowerCase() },
        select: { id: true },
      });
    });

    if (duplicateEmail) {
      throw new DuplicateEmailError(updateData.email);
    }
  }

  // Build the update object with only provided fields
  const updateFields: Record<string, unknown> = {};

  // Process each field - only include if explicitly provided (not undefined)
  if (updateData.email !== undefined) {
    updateFields.email = updateData.email.toLowerCase();
  }
  if (updateData.firstName !== undefined) {
    updateFields.firstName = updateData.firstName;
  }
  if (updateData.lastName !== undefined) {
    updateFields.lastName = updateData.lastName;
  }
  if (updateData.fullName !== undefined) {
    updateFields.fullName = updateData.fullName;
  }
  if (updateData.title !== undefined) {
    updateFields.title = updateData.title;
  }
  if (updateData.listName !== undefined) {
    updateFields.listName = updateData.listName;
  }
  if (updateData.emailType !== undefined) {
    updateFields.emailType = updateData.emailType;
  }
  if (updateData.emailStatus !== undefined) {
    updateFields.emailStatus = updateData.emailStatus;
  }
  if (updateData.location !== undefined) {
    updateFields.location = updateData.location;
  }
  if (updateData.locality !== undefined) {
    updateFields.locality = updateData.locality;
  }
  if (updateData.region !== undefined) {
    updateFields.region = updateData.region;
  }
  if (updateData.country !== undefined) {
    updateFields.country = updateData.country;
  }
  if (updateData.linkedin !== undefined) {
    updateFields.linkedin = updateData.linkedin;
  }
  if (updateData.profileUrl !== undefined) {
    updateFields.profileUrl = updateData.profileUrl;
  }
  if (updateData.domain !== undefined) {
    updateFields.domain = updateData.domain;
  }
  if (updateData.companyName !== undefined) {
    updateFields.companyName = updateData.companyName;
  }
  if (updateData.companyDomain !== undefined) {
    updateFields.companyDomain = updateData.companyDomain;
  }
  if (updateData.companyIndustry !== undefined) {
    updateFields.companyIndustry = updateData.companyIndustry;
  }
  if (updateData.companySubindustry !== undefined) {
    updateFields.companySubindustry = updateData.companySubindustry;
  }
  if (updateData.companySize !== undefined) {
    updateFields.companySize = updateData.companySize;
  }
  if (updateData.companySizeRange !== undefined) {
    updateFields.companySizeRange = updateData.companySizeRange;
  }
  if (updateData.companyFounded !== undefined) {
    updateFields.companyFounded = updateData.companyFounded;
  }
  if (updateData.companyRevenue !== undefined) {
    updateFields.companyRevenue = updateData.companyRevenue;
  }
  if (updateData.companyFunding !== undefined) {
    updateFields.companyFunding = updateData.companyFunding;
  }
  if (updateData.companyType !== undefined) {
    updateFields.companyType = updateData.companyType;
  }
  if (updateData.companyLinkedin !== undefined) {
    updateFields.companyLinkedin = updateData.companyLinkedin;
  }
  if (updateData.companyTwitter !== undefined) {
    updateFields.companyTwitter = updateData.companyTwitter;
  }
  if (updateData.companyFacebook !== undefined) {
    updateFields.companyFacebook = updateData.companyFacebook;
  }
  if (updateData.companyDescription !== undefined) {
    updateFields.companyDescription = updateData.companyDescription;
  }
  if (updateData.linkedinProfileUrl !== undefined) {
    updateFields.linkedinProfileUrl = updateData.linkedinProfileUrl;
  }
  if (updateData.companyLastFundingRound !== undefined) {
    updateFields.companyLastFundingRound = updateData.companyLastFundingRound;
  }
  if (updateData.companyLastFundingAmount !== undefined) {
    updateFields.companyLastFundingAmount = updateData.companyLastFundingAmount;
  }
  if (updateData.companyLastFundingAt !== undefined) {
    updateFields.companyLastFundingAt = updateData.companyLastFundingAt;
  }
  if (updateData.companyLocation !== undefined) {
    updateFields.companyLocation = updateData.companyLocation;
  }
  if (updateData.companyStreet !== undefined) {
    updateFields.companyStreet = updateData.companyStreet;
  }
  if (updateData.companyLocality !== undefined) {
    updateFields.companyLocality = updateData.companyLocality;
  }
  if (updateData.companyRegion !== undefined) {
    updateFields.companyRegion = updateData.companyRegion;
  }
  if (updateData.companyCountry !== undefined) {
    updateFields.companyCountry = updateData.companyCountry;
  }
  if (updateData.companyPostalCode !== undefined) {
    updateFields.companyPostalCode = updateData.companyPostalCode;
  }
  if (updateData.otherWorkEmails !== undefined) {
    updateFields.otherWorkEmails = updateData.otherWorkEmails;
  }
  if (updateData.decisionMaker !== undefined) {
    updateFields.decisionMaker = updateData.decisionMaker;
  }
  if (updateData.isUnsubscribed !== undefined) {
    updateFields.isUnsubscribed = updateData.isUnsubscribed;
  }

  // Update the contact
  const contact = await withDb(async () => {
    return prisma.contact.update({
      where: { id },
      data: updateFields,
    });
  });

  return {
    id: contact.id,
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    fullName: contact.fullName,
    title: contact.title,
    listName: contact.listName,
    emailType: contact.emailType,
    emailStatus: contact.emailStatus,
    location: contact.location,
    locality: contact.locality,
    region: contact.region,
    country: contact.country,
    linkedin: contact.linkedin,
    profileUrl: contact.profileUrl,
    domain: contact.domain,
    companyName: contact.companyName,
    companyDomain: contact.companyDomain,
    companyIndustry: contact.companyIndustry,
    companySubindustry: contact.companySubindustry,
    companySize: contact.companySize,
    companySizeRange: contact.companySizeRange,
    companyFounded: contact.companyFounded,
    companyRevenue: contact.companyRevenue,
    companyFunding: contact.companyFunding,
    companyType: contact.companyType,
    companyLinkedin: contact.companyLinkedin,
    companyTwitter: contact.companyTwitter,
    companyFacebook: contact.companyFacebook,
    companyDescription: contact.companyDescription,
    linkedinProfileUrl: contact.linkedinProfileUrl,
    companyLastFundingRound: contact.companyLastFundingRound,
    companyLastFundingAmount: contact.companyLastFundingAmount,
    companyLastFundingAt: contact.companyLastFundingAt,
    companyLocation: contact.companyLocation,
    companyStreet: contact.companyStreet,
    companyLocality: contact.companyLocality,
    companyRegion: contact.companyRegion,
    companyCountry: contact.companyCountry,
    companyPostalCode: contact.companyPostalCode,
    otherWorkEmails: contact.otherWorkEmails,
    decisionMaker: contact.decisionMaker,
    isUnsubscribed: contact.isUnsubscribed,
    createdAt: contact.createdAt,
  };
}

// Register the contacts_update tool
registerTool(
  {
    name: "contacts_update",
    description:
      "Update an existing contact. Only provided fields will be updated. Returns the updated contact or an error if the contact is not found or if updating email to one that already exists.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The UUID of the contact to update (required)",
        },
        email: {
          type: "string",
          description: "New email address (must be unique)",
        },
        firstName: {
          type: "string",
          description: "New first name",
        },
        lastName: {
          type: "string",
          description: "New last name",
        },
        fullName: {
          type: "string",
          description: "New full name",
        },
        title: {
          type: "string",
          description: "Job title or position",
        },
        listName: {
          type: "string",
          description: "Name of the list this contact belongs to",
        },
        emailType: {
          type: "string",
          description: "Type of email (work, personal, etc.)",
        },
        emailStatus: {
          type: "string",
          description: "Email status (valid, invalid, etc.)",
        },
        location: {
          type: "string",
          description: "Full location string",
        },
        locality: {
          type: "string",
          description: "City or locality",
        },
        region: {
          type: "string",
          description: "State, province, or region",
        },
        country: {
          type: "string",
          description: "Country name or code",
        },
        linkedin: {
          type: "string",
          description: "LinkedIn profile URL",
        },
        profileUrl: {
          type: "string",
          description: "Other profile URL",
        },
        domain: {
          type: "string",
          description: "Contact's personal domain",
        },
        companyName: {
          type: "string",
          description: "Company name",
        },
        companyDomain: {
          type: "string",
          description: "Company website domain",
        },
        companyIndustry: {
          type: "string",
          description: "Primary industry",
        },
        companySubindustry: {
          type: "string",
          description: "Sub-industry or specialization",
        },
        companySize: {
          type: "number",
          description: "Number of employees",
        },
        companySizeRange: {
          type: "string",
          description: "Size range (e.g., '11-50', '51-200')",
        },
        companyFounded: {
          type: "number",
          description: "Year company was founded",
        },
        companyRevenue: {
          type: "string",
          description: "Revenue range or amount",
        },
        companyFunding: {
          type: "string",
          description: "Total funding amount",
        },
        companyType: {
          type: "string",
          description: "Company type (public, private, etc.)",
        },
        companyLinkedin: {
          type: "string",
          description: "Company LinkedIn page",
        },
        companyTwitter: {
          type: "string",
          description: "Company Twitter/X profile",
        },
        companyFacebook: {
          type: "string",
          description: "Company Facebook page",
        },
        companyDescription: {
          type: "string",
          description: "Company description",
        },
        linkedinProfileUrl: {
          type: "string",
          description: "LinkedIn profile URL (alternate)",
        },
        companyLastFundingRound: {
          type: "string",
          description: "Last funding round type (Series A, B, etc.)",
        },
        companyLastFundingAmount: {
          type: "string",
          description: "Amount raised in last round",
        },
        companyLastFundingAt: {
          type: "string",
          description: "Date of last funding round",
        },
        companyLocation: {
          type: "string",
          description: "Company full address",
        },
        companyStreet: {
          type: "string",
          description: "Company street address",
        },
        companyLocality: {
          type: "string",
          description: "Company city",
        },
        companyRegion: {
          type: "string",
          description: "Company state/province",
        },
        companyCountry: {
          type: "string",
          description: "Company country",
        },
        companyPostalCode: {
          type: "string",
          description: "Company postal/ZIP code",
        },
        otherWorkEmails: {
          type: "string",
          description: "Other work email addresses (comma-separated)",
        },
        decisionMaker: {
          type: "boolean",
          description: "Is this contact a decision maker?",
        },
        isUnsubscribed: {
          type: "boolean",
          description: "Is this contact unsubscribed?",
        },
      },
      required: ["id"],
    },
  },
  contactsUpdate
);

// ============================================================================
// contacts_delete Tool
// ============================================================================

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
async function contactsDelete(args: Record<string, unknown>): Promise<ContactDeleteResponse> {
  const id = args.id;
  const force = args.force === true;

  // Validate ID is provided and is a string
  if (!id || typeof id !== "string") {
    throw new ValidationError("Contact ID is required", {
      id: ["Contact ID must be a valid UUID string"],
    });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new ValidationError("Invalid contact ID format", {
      id: ["Contact ID must be a valid UUID"],
    });
  }

  // Check that contact exists and get campaign email count
  const existingContact = await withDb(async () => {
    const contact = await prisma.contact.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!contact) {
      return null;
    }

    const campaignEmailsCount = await prisma.campaignEmail.count({
      where: { contactId: id },
    });

    return { contact, campaignEmailsCount };
  });

  if (!existingContact) {
    throw new ContactNotFoundError(id);
  }

  const { contact, campaignEmailsCount } = existingContact;

  // If there are related campaign emails and force is not set, warn the user
  if (campaignEmailsCount > 0 && !force) {
    throw new ValidationError(
      `Contact has ${campaignEmailsCount} related campaign email(s). Use force=true to delete anyway.`,
      {
        force: [`This contact has ${campaignEmailsCount} campaign email records. Set force=true to delete the contact and all related records.`],
      }
    );
  }

  // Delete the contact and related campaign emails in a transaction
  const deletedCampaignEmails = await withDb(async () => {
    // First delete related campaign emails
    const deleteResult = await prisma.campaignEmail.deleteMany({
      where: { contactId: id },
    });

    // Then delete the contact
    await prisma.contact.delete({
      where: { id },
    });

    return deleteResult.count;
  });

  return {
    success: true,
    id,
    email: contact.email,
    deletedCampaignEmails,
    message: deletedCampaignEmails > 0
      ? `Contact deleted successfully along with ${deletedCampaignEmails} related campaign email(s).`
      : "Contact deleted successfully.",
  };
}

// Register the contacts_delete tool
registerTool(
  {
    name: "contacts_delete",
    description:
      "Delete a contact by ID. If the contact has related campaign emails, you must set force=true to confirm deletion. This will also delete all campaign email records associated with the contact.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The UUID of the contact to delete (required)",
        },
        force: {
          type: "boolean",
          description: "Set to true to delete the contact even if it has related campaign emails (default: false)",
        },
      },
      required: ["id"],
    },
  },
  contactsDelete
);

// ============================================================================
// contacts_bulk_create Tool
// ============================================================================

/**
 * Bulk create contacts with transaction support
 */
async function contactsBulkCreate(args: Record<string, unknown>): Promise<ContactBulkCreateResponse> {
  // Validate input using Zod schema
  const validation = validateContactBulkCreate(args);
  if (!validation.success) {
    throw new ValidationError("Invalid bulk create data", validation.errors);
  }

  const { contacts, skipDuplicates } = validation.data!;

  // Track results
  const result: ContactBulkCreateResponse = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  // First, check for duplicates within the input array
  const emailsInBatch = new Map<string, number>();
  for (let i = 0; i < contacts.length; i++) {
    const email = contacts[i].email.toLowerCase();
    if (emailsInBatch.has(email)) {
      if (skipDuplicates) {
        result.skipped++;
        result.errors.push({
          index: i,
          email: contacts[i].email,
          message: `Duplicate email in batch (same as index ${emailsInBatch.get(email)})`,
        });
      } else {
        throw new ValidationError(`Duplicate email in batch at index ${i}`, {
          [`contacts.${i}.email`]: [`Email "${contacts[i].email}" appears multiple times in the batch`],
        });
      }
    } else {
      emailsInBatch.set(email, i);
    }
  }

  // Get existing emails from database
  const existingEmails = await withDb(async () => {
    const emails = Array.from(emailsInBatch.keys());
    const existing = await prisma.contact.findMany({
      where: {
        email: { in: emails },
      },
      select: { email: true },
    });
    return new Set(existing.map((c: { email: string }) => c.email.toLowerCase()));
  });

  // Filter contacts to create based on duplicate handling
  const contactsToCreate: Array<{
    index: number;
    data: typeof contacts[0];
  }> = [];

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const email = contact.email.toLowerCase();

    // Skip if already counted as duplicate in batch
    const firstOccurrence = emailsInBatch.get(email);
    if (firstOccurrence !== i) {
      continue; // Already handled above
    }

    if (existingEmails.has(email)) {
      if (skipDuplicates) {
        result.skipped++;
        result.errors.push({
          index: i,
          email: contact.email,
          message: "Email already exists in database",
        });
      } else {
        throw new ValidationError(`Email already exists at index ${i}`, {
          [`contacts.${i}.email`]: [`A contact with email "${contact.email}" already exists`],
        });
      }
    } else {
      contactsToCreate.push({ index: i, data: contact });
    }
  }

  // If nothing to create, return early
  if (contactsToCreate.length === 0) {
    return result;
  }

  // Bulk create in a transaction
  await withDb(async () => {
    return prisma.$transaction(async (tx: typeof prisma) => {
      for (const { index, data } of contactsToCreate) {
        try {
          // Auto-generate fullName if not provided
          const fullName = data.fullName || `${data.firstName} ${data.lastName}`;

          await tx.contact.create({
            data: {
              email: data.email.toLowerCase(),
              firstName: data.firstName,
              lastName: data.lastName,
              fullName,
              title: data.title ?? null,
              listName: data.listName ?? null,
              emailType: data.emailType ?? null,
              emailStatus: data.emailStatus ?? null,
              location: data.location ?? null,
              locality: data.locality ?? null,
              region: data.region ?? null,
              country: data.country ?? null,
              linkedin: data.linkedin ?? null,
              profileUrl: data.profileUrl ?? null,
              domain: data.domain ?? null,
              companyName: data.companyName ?? null,
              companyDomain: data.companyDomain ?? null,
              companyIndustry: data.companyIndustry ?? null,
              companySubindustry: data.companySubindustry ?? null,
              companySize: data.companySize ?? null,
              companySizeRange: data.companySizeRange ?? null,
              companyFounded: data.companyFounded ?? null,
              companyRevenue: data.companyRevenue ?? null,
              companyFunding: data.companyFunding ?? null,
              companyType: data.companyType ?? null,
              companyLinkedin: data.companyLinkedin ?? null,
              companyTwitter: data.companyTwitter ?? null,
              companyFacebook: data.companyFacebook ?? null,
              companyDescription: data.companyDescription ?? null,
              linkedinProfileUrl: data.linkedinProfileUrl ?? null,
              companyLastFundingRound: data.companyLastFundingRound ?? null,
              companyLastFundingAmount: data.companyLastFundingAmount ?? null,
              companyLastFundingAt: data.companyLastFundingAt ?? null,
              companyLocation: data.companyLocation ?? null,
              companyStreet: data.companyStreet ?? null,
              companyLocality: data.companyLocality ?? null,
              companyRegion: data.companyRegion ?? null,
              companyCountry: data.companyCountry ?? null,
              companyPostalCode: data.companyPostalCode ?? null,
              otherWorkEmails: data.otherWorkEmails ?? null,
              decisionMaker: data.decisionMaker ?? null,
              isUnsubscribed: false,
            },
          });
          result.created++;
        } catch (error) {
          // If any individual create fails, record the error
          result.errors.push({
            index,
            email: data.email,
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    });
  });

  return result;
}

// Register the contacts_bulk_create tool
registerTool(
  {
    name: "contacts_bulk_create",
    description:
      "Bulk create multiple contacts in a single operation. Accepts an array of up to 100 contacts. Use skipDuplicates=true to skip contacts with existing emails instead of failing. Returns counts of created/skipped contacts and any errors.",
    inputSchema: {
      type: "object",
      properties: {
        contacts: {
          type: "array",
          description: "Array of contacts to create (max 100)",
          items: {
            type: "object",
            properties: {
              email: {
                type: "string",
                description: "Contact's email address (required, must be unique)",
              },
              firstName: {
                type: "string",
                description: "Contact's first name (required)",
              },
              lastName: {
                type: "string",
                description: "Contact's last name (required)",
              },
              fullName: {
                type: "string",
                description: "Full name (auto-generated from firstName + lastName if not provided)",
              },
              title: {
                type: "string",
                description: "Job title or position",
              },
              listName: {
                type: "string",
                description: "Name of the list this contact belongs to",
              },
              companyName: {
                type: "string",
                description: "Company name",
              },
              companyIndustry: {
                type: "string",
                description: "Primary industry",
              },
              companySize: {
                type: "number",
                description: "Number of employees",
              },
              country: {
                type: "string",
                description: "Country name or code",
              },
              region: {
                type: "string",
                description: "State, province, or region",
              },
              locality: {
                type: "string",
                description: "City or locality",
              },
              decisionMaker: {
                type: "boolean",
                description: "Is this contact a decision maker?",
              },
            },
            required: ["email", "firstName", "lastName"],
          },
        },
        skipDuplicates: {
          type: "boolean",
          description: "If true, skip contacts with duplicate emails instead of failing (default: false)",
        },
      },
      required: ["contacts"],
    },
  },
  contactsBulkCreate
);

export { contactsList, contactsGet, contactsCreate, contactsUpdate, contactsDelete, contactsBulkCreate };
