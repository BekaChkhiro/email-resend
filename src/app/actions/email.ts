'use server'

import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { validateEmail, parseValidationResult } from '@/lib/emailValidator';

type StatusFilter = "all" | "valid" | "invalid" | "catch-all" | "unknown" | "disposable" | "not_verified" | "invalid_all";

const KNOWN_STATUSES = ["valid", "invalid", "catch-all", "unknown", "disposable"] as const;

function buildScopeWhere(scope: {
  q?: string;
  status?: StatusFilter;
}): Prisma.ContactWhereInput {
  const conditions: Prisma.ContactWhereInput[] = [];
  if (scope.q) {
    const q = scope.q;
    conditions.push({
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { country: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  const s = scope.status;
  if (s && s !== "all") {
    if (s === "not_verified") {
      conditions.push({ OR: [{ emailStatus: null }, { emailStatus: "" }] });
    } else if (s === "invalid_all") {
      conditions.push({
        AND: [
          { emailStatus: { not: null } },
          { emailStatus: { not: "" } },
          { emailStatus: { not: "valid" } },
        ],
      });
    } else if ((KNOWN_STATUSES as readonly string[]).includes(s)) {
      conditions.push({ emailStatus: s });
    }
  }
  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];
  return { AND: conditions };
}

export interface CheckEmailResult {
  isValid: boolean;
  isDeliverable: boolean;
  isDisposable: boolean;
  score: number;
  status: string;
  message: string;
}

// Validate a single email
export async function checkEmail(email: string): Promise<CheckEmailResult> {
  const result = await validateEmail(email);
  const parsed = parseValidationResult(result);

  return {
    isValid: parsed.isValid,
    isDeliverable: parsed.isDeliverable,
    isDisposable: parsed.isDisposable,
    score: parsed.score,
    status: parsed.status,
    message: parsed.message
  };
}

// Validate a single contact and update its status
export async function validateContactEmail(contactId: string): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { email: true }
    });

    if (!contact) {
      return { success: false, error: 'Contact not found' };
    }

    const result = await validateEmail(contact.email);
    const parsed = parseValidationResult(result);

    // Determine final status - use string type for database
    let status: string = parsed.status;
    if (parsed.isDisposable) {
      status = 'disposable';
    }

    // Update contact in database
    await prisma.contact.update({
      where: { id: contactId },
      data: { emailStatus: status }
    });

    revalidatePath('/contacts');

    return { success: true, status };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Validation failed'
    };
  }
}

// Validate multiple contacts (one by one with delay on client side)
export async function validateContactEmailBatch(contactIds: string[]): Promise<{
  total: number;
  validated: number;
  results: Array<{
    contactId: string;
    email: string;
    status: string | null;
    error: string | null;
  }>;
}> {
  const results: Array<{
    contactId: string;
    email: string;
    status: string | null;
    error: string | null;
  }> = [];

  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds } },
    select: { id: true, email: true }
  });

  // Note: This will be slow due to rate limiting
  // Better approach: use client-side queue with streaming updates
  for (const contact of contacts) {
    try {
      const result = await validateEmail(contact.email);
      const parsed = parseValidationResult(result);

      let status: string = parsed.status;
      if (parsed.isDisposable) {
        status = 'disposable';
      }

      await prisma.contact.update({
        where: { id: contact.id },
        data: { emailStatus: status }
      });

      results.push({
        contactId: contact.id,
        email: contact.email,
        status,
        error: null
      });

      // Rate limit: wait 12 seconds between requests
      if (contacts.indexOf(contact) < contacts.length - 1) {
        await new Promise(r => setTimeout(r, 12000));
      }
    } catch (err) {
      results.push({
        contactId: contact.id,
        email: contact.email,
        status: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }

  revalidatePath('/contacts');

  return {
    total: contactIds.length,
    validated: results.filter(r => r.status !== null).length,
    results
  };
}

// Get contacts that need validation
export async function getContactsToValidate(limit: number = 50): Promise<Array<{
  id: string;
  email: string;
  emailStatus: string | null;
}>> {
  return prisma.contact.findMany({
    where: {
      OR: [
        { emailStatus: null },
        { emailStatus: '' }
      ]
    },
    select: {
      id: true,
      email: true,
      emailStatus: true
    },
    take: limit,
    orderBy: { createdAt: 'desc' }
  });
}

// Get validation stats
export async function getValidationStats(): Promise<{
  total: number;
  validated: number;
  valid: number;
  invalid: number;
  catchAll: number;
  disposable: number;
  unknown: number;
  notValidated: number;
}> {
  const [
    total,
    valid,
    invalid,
    catchAll,
    disposable,
    unknown,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({ where: { emailStatus: 'valid' } }),
    prisma.contact.count({ where: { emailStatus: 'invalid' } }),
    prisma.contact.count({ where: { emailStatus: 'catch-all' } }),
    prisma.contact.count({ where: { emailStatus: 'disposable' } }),
    prisma.contact.count({ where: { emailStatus: 'unknown' } }),
  ]);

  const validated = valid + invalid + catchAll + disposable + unknown;
  const notValidated = total - validated;

  return {
    total,
    validated,
    valid,
    invalid,
    catchAll,
    disposable,
    unknown,
    notValidated
  };
}

// Update single contact email status (for manual override or client-side validation)
export async function updateContactEmailStatus(
  contactId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.contact.update({
      where: { id: contactId },
      data: { emailStatus: status }
    });
    revalidatePath('/contacts');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Update failed'
    };
  }
}

// Reset email statuses for a scope (search/filter). Pass {} to reset everything.
export async function resetEmailStatuses(scope: {
  q?: string;
  status?: StatusFilter;
} = {}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const where = buildScopeWhere(scope);
    const result = await prisma.contact.updateMany({
      where,
      data: { emailStatus: null },
    });
    revalidatePath('/contacts');
    return { success: true, count: result.count };
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Reset failed'
    };
  }
}

// Delete contacts in a scope (e.g., status = invalid_all + optional search)
export async function deleteContactsByScope(scope: {
  q?: string;
  status?: StatusFilter;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const where = buildScopeWhere(scope);
    if (Object.keys(where).length === 0) {
      return { success: false, count: 0, error: "Refusing to delete with no scope" };
    }
    const result = await prisma.contact.deleteMany({ where });
    revalidatePath('/contacts');
    return { success: true, count: result.count };
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Delete failed'
    };
  }
}

// Delete by explicit IDs (for bulk-select)
export async function deleteContactsByIds(ids: string[]): Promise<{
  success: boolean; count: number; error?: string;
}> {
  if (!ids || ids.length === 0) return { success: true, count: 0 };
  try {
    const result = await prisma.contact.deleteMany({ where: { id: { in: ids } } });
    revalidatePath('/contacts');
    return { success: true, count: result.count };
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Delete failed'
    };
  }
}

// Process one batch of unverified contacts synchronously on the server.
// Used by the "Validate Now" button to trigger an immediate batch without
// waiting for the next cron tick. The cron continues to run in parallel.
export async function runValidationBatch(batchSize = 5): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  remainingAfter: number;
}> {
  const batch = await prisma.contact.findMany({
    where: { OR: [{ emailStatus: null }, { emailStatus: "" }] },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  let succeeded = 0;
  let failed = 0;

  for (const contact of batch) {
    try {
      const result = await validateEmail(contact.email);
      const parsed = parseValidationResult(result);
      const status: string = parsed.isDisposable ? "disposable" : parsed.status;
      await prisma.contact.update({
        where: { id: contact.id },
        data: { emailStatus: status },
      });
      succeeded++;
    } catch {
      failed++;
    }
  }

  const remainingAfter = await prisma.contact.count({
    where: { OR: [{ emailStatus: null }, { emailStatus: "" }] },
  });

  revalidatePath("/contacts");
  return { processed: batch.length, succeeded, failed, remainingAfter };
}

// Count contacts in a scope that still need validation (null or '')
export async function countUnverifiedInScope(scope: {
  q?: string;
  status?: StatusFilter;
} = {}): Promise<number> {
  const baseWhere = buildScopeWhere(scope);
  const unverifiedWhere: Prisma.ContactWhereInput = {
    OR: [{ emailStatus: null }, { emailStatus: "" }],
  };
  const where =
    Object.keys(baseWhere).length === 0
      ? unverifiedWhere
      : { AND: [baseWhere, unverifiedWhere] };
  return prisma.contact.count({ where });
}

// Fetch the next batch of unverified contacts in a scope (for the client loop)
export async function fetchUnverifiedBatch(
  scope: { q?: string; status?: StatusFilter } = {},
  limit = 25
): Promise<Array<{ id: string; email: string }>> {
  const baseWhere = buildScopeWhere(scope);
  const unverifiedWhere: Prisma.ContactWhereInput = {
    OR: [{ emailStatus: null }, { emailStatus: "" }],
  };
  const where =
    Object.keys(baseWhere).length === 0
      ? unverifiedWhere
      : { AND: [baseWhere, unverifiedWhere] };
  return prisma.contact.findMany({
    where,
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}
