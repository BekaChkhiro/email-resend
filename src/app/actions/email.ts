'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { validateEmail, parseValidationResult } from '@/lib/emailValidator';

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

// Reset all email statuses to null
export async function resetAllEmailStatuses(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const result = await prisma.contact.updateMany({
      data: { emailStatus: null }
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
