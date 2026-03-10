/**
 * Domain management MCP tools
 */

import { registerTool } from "./index.js";
import { prisma, withDb } from "../utils/db.js";
import { ValidationError } from "../utils/errors.js";
import {
  validateDomainListFilters,
  type DomainListResponse,
} from "../schemas/domains.js";

// ============================================================================
// domains_list Tool
// ============================================================================

/**
 * List all domains with optional filtering by isActive and warmupEnabled
 */
async function domainsList(args: Record<string, unknown>): Promise<DomainListResponse> {
  // Validate input
  const validation = validateDomainListFilters(args);
  if (!validation.success) {
    throw new ValidationError("Invalid filter parameters", validation.errors);
  }

  const filters = validation.data!;

  // Build where clause
  const where: Record<string, unknown> = {};

  // Filter by isActive
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  // Filter by warmupEnabled
  if (filters.warmupEnabled !== undefined) {
    where.warmupEnabled = filters.warmupEnabled;
  }

  // Search in domain name and from email
  if (filters.search) {
    where.OR = [
      { domain: { contains: filters.search, mode: "insensitive" } },
      { fromEmail: { contains: filters.search, mode: "insensitive" } },
      { fromName: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Build order by clause
  const orderBy = {
    [filters.sortBy]: filters.sortOrder,
  };

  // Execute queries
  const [domains, total] = await withDb(async () => {
    return Promise.all([
      prisma.domain.findMany({
        where,
        orderBy,
        skip: filters.offset,
        take: filters.limit,
      }),
      prisma.domain.count({ where }),
    ]);
  });

  return {
    domains: domains.map((domain: {
      id: string;
      domain: string;
      fromName: string;
      fromEmail: string;
      isActive: boolean;
      createdAt: Date;
      warmupEnabled: boolean;
      warmupStartedAt: Date | null;
      warmupCompletedAt: Date | null;
      warmupDay: number;
      warmupSentToday: number;
      warmupLastSentAt: Date | null;
    }) => ({
      id: domain.id,
      domain: domain.domain,
      fromName: domain.fromName,
      fromEmail: domain.fromEmail,
      isActive: domain.isActive,
      createdAt: domain.createdAt,
      warmupEnabled: domain.warmupEnabled,
      warmupStartedAt: domain.warmupStartedAt,
      warmupCompletedAt: domain.warmupCompletedAt,
      warmupDay: domain.warmupDay,
      warmupSentToday: domain.warmupSentToday,
      warmupLastSentAt: domain.warmupLastSentAt,
    })),
    total,
    limit: filters.limit,
    offset: filters.offset,
    hasMore: filters.offset + domains.length < total,
  };
}

// Register the tool
registerTool(
  {
    name: "domains_list",
    description:
      "List all email sending domains with optional filtering. Supports filtering by active status and warmup enabled status, plus search and pagination.",
    inputSchema: {
      type: "object",
      properties: {
        isActive: {
          type: "boolean",
          description: "Filter by active status (true = only active domains, false = only inactive)",
        },
        warmupEnabled: {
          type: "boolean",
          description: "Filter by warmup enabled status (true = only warming up, false = not warming up)",
        },
        search: {
          type: "string",
          description: "Search in domain name, from name, and from email",
        },
        sortBy: {
          type: "string",
          enum: ["createdAt", "domain", "fromName", "warmupDay"],
          description: "Field to sort by (default: createdAt)",
        },
        sortOrder: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Sort direction (default: desc)",
        },
        limit: {
          type: "number",
          description: "Maximum number of domains to return (1-100, default: 20)",
        },
        offset: {
          type: "number",
          description: "Number of domains to skip for pagination (default: 0)",
        },
      },
      required: [],
    },
  },
  domainsList
);

export { domainsList };
