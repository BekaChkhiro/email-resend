const EMAIL_API_URL = 'https://emailcheck.infinity.ge';

export interface EmailValidationResult {
  success: boolean;
  data: {
    address: string;
    status: 'valid' | 'invalid' | 'catch-all' | 'unknown';
    sub_status: string;
    score: number;
    free_email: boolean;
    disposable: boolean;
    role_based: boolean;
    smtp_check: {
      success: boolean;
      deliverable: boolean | null;
      message: string;
    };
  };
  meta: {
    duration_ms: number;
  };
}

export interface EmailValidationSummary {
  isValid: boolean;
  isDeliverable: boolean;
  isDisposable: boolean;
  isFreeEmail: boolean;
  isRoleBased: boolean;
  score: number;
  status: 'valid' | 'invalid' | 'catch-all' | 'unknown';
  message: string;
}

// Simple single email validation
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  const res = await fetch(`${EMAIL_API_URL}/validate?email=${encodeURIComponent(email)}`);
  if (!res.ok) {
    throw new Error(`Email validation failed: ${res.statusText}`);
  }
  return res.json();
}

// Batch validation (if API supports it)
export async function validateEmailsBatch(emails: string[]): Promise<EmailValidationResult[]> {
  const res = await fetch(`${EMAIL_API_URL}/validate/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails })
  });
  if (!res.ok) {
    throw new Error(`Batch email validation failed: ${res.statusText}`);
  }
  const data = await res.json();
  return data.data;
}

// Parse validation result to a simpler format
export function parseValidationResult(result: EmailValidationResult): EmailValidationSummary {
  return {
    isValid: result.data.status === 'valid',
    isDeliverable: result.data.smtp_check.deliverable === true,
    isDisposable: result.data.disposable,
    isFreeEmail: result.data.free_email,
    isRoleBased: result.data.role_based,
    score: result.data.score,
    status: result.data.status,
    message: result.data.smtp_check.message
  };
}

// Queue-based validation with rate limiting (5 requests/minute = 12 seconds delay)
const RATE_LIMIT_DELAY = 12000; // 12 seconds

export interface QueuedValidationResult {
  email: string;
  result: EmailValidationSummary | null;
  error: string | null;
}

export async function validateEmailsWithQueue(
  emails: string[],
  onProgress?: (completed: number, total: number, current: QueuedValidationResult) => void
): Promise<QueuedValidationResult[]> {
  const results: QueuedValidationResult[] = [];

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];

    try {
      const rawResult = await validateEmail(email);
      const result = parseValidationResult(rawResult);

      const queuedResult: QueuedValidationResult = {
        email,
        result,
        error: null
      };

      results.push(queuedResult);
      onProgress?.(i + 1, emails.length, queuedResult);

    } catch (err) {
      const queuedResult: QueuedValidationResult = {
        email,
        result: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      };

      results.push(queuedResult);
      onProgress?.(i + 1, emails.length, queuedResult);
    }

    // Wait between requests (except for the last one)
    if (i < emails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  return results;
}

// Helper to get status display info
export function getEmailStatusInfo(status: string | null): {
  label: string;
  color: 'green' | 'red' | 'yellow' | 'gray';
  bgClass: string;
  textClass: string;
} {
  switch (status) {
    case 'valid':
      return {
        label: 'Valid',
        color: 'green',
        bgClass: 'bg-emerald-50 dark:bg-emerald-500/10',
        textClass: 'text-emerald-700 dark:text-emerald-400'
      };
    case 'invalid':
      return {
        label: 'Invalid',
        color: 'red',
        bgClass: 'bg-red-50 dark:bg-red-500/10',
        textClass: 'text-red-700 dark:text-red-400'
      };
    case 'catch-all':
      return {
        label: 'Catch-all',
        color: 'yellow',
        bgClass: 'bg-amber-50 dark:bg-amber-500/10',
        textClass: 'text-amber-700 dark:text-amber-400'
      };
    case 'unknown':
      return {
        label: 'Unknown',
        color: 'gray',
        bgClass: 'bg-gray-50 dark:bg-zinc-500/10',
        textClass: 'text-gray-600 dark:text-zinc-400'
      };
    case 'disposable':
      return {
        label: 'Disposable',
        color: 'red',
        bgClass: 'bg-orange-50 dark:bg-orange-500/10',
        textClass: 'text-orange-700 dark:text-orange-400'
      };
    default:
      return {
        label: 'Not Verified',
        color: 'gray',
        bgClass: 'bg-gray-50 dark:bg-zinc-700',
        textClass: 'text-gray-500 dark:text-zinc-500'
      };
  }
}
