/**
 * Background worker for standalone email-validation jobs.
 *
 * Independent of the Contacts validation worker. Pulls pending
 * ValidationEmail rows (status = null) across all active jobs, calls the
 * validator service for each, writes the result back, and keeps the parent
 * ValidationJob counters / status in sync.
 *
 * Architecture mirrors validation-worker.ts:
 *   - One tick = process up to BATCH_SIZE pending emails
 *   - Sequential per batch (stays under the validator's 5/min limit)
 *   - Sleeps INTERVAL_MS between active batches, IDLE_INTERVAL_MS when idle
 *   - Single-flight: a tick already running skips the next one
 *
 * NOTE: this shares the same external validator (and its 5/min rate limit)
 * with the Contacts validation worker. The cron driver
 * (/api/cron/validate-jobs) processes one batch per invocation so a single
 * scheduler can pace the combined request rate.
 */

import { prisma } from "./db";
import { validateEmail, parseValidationResult } from "./emailValidator";

const BATCH_SIZE = 5;
const INTERVAL_MS = 120_000; // 2 minutes between active batches (rate limit)
const IDLE_INTERVAL_MS = 20_000; // poll every 20s when idle so new jobs start fast
const STARTUP_DELAY_MS = 15_000;

type WorkerState = {
  running: boolean;
  ticking: boolean;
  startedAt: Date | null;
  lastTickAt: Date | null;
  lastTickResult: { processed: number; succeeded: number; failed: number } | null;
  totalProcessed: number;
  totalSucceeded: number;
  totalFailed: number;
  errors: number;
  lastError: string | null;
};

declare global {
  var __validationJobWorker: WorkerState | undefined;
  var __validationJobWorkerTimer: NodeJS.Timeout | undefined;
  var __validationJobPaused: Set<string> | undefined;
}

// Job IDs the user has paused. Lives in the server process (shared by the
// worker, server actions, and API routes — all same process on Railway).
// Not persisted: a server restart clears pauses, which is acceptable for a
// transient "stop" control.
const pausedJobs: Set<string> = globalThis.__validationJobPaused ?? new Set();
globalThis.__validationJobPaused = pausedJobs;

export function pauseJob(jobId: string): void {
  pausedJobs.add(jobId);
}

export function resumeJob(jobId: string): void {
  pausedJobs.delete(jobId);
}

export function isJobPaused(jobId: string): boolean {
  return pausedJobs.has(jobId);
}

const state: WorkerState =
  globalThis.__validationJobWorker ?? {
    running: false,
    ticking: false,
    startedAt: null,
    lastTickAt: null,
    lastTickResult: null,
    totalProcessed: 0,
    totalSucceeded: 0,
    totalFailed: 0,
    errors: 0,
    lastError: null,
  };

globalThis.__validationJobWorker = state;

export function getJobWorkerState(): Readonly<WorkerState> {
  return { ...state };
}

/**
 * Validate one email row and persist the outcome, keeping the parent job's
 * counters in sync inside a single transaction. Returns true if validated,
 * false if the validator call failed.
 */
export async function processValidationEmail(row: {
  id: string;
  jobId: string;
  email: string;
}): Promise<boolean> {
  // The external API call is intentionally OUTSIDE the transaction so we
  // never hold a DB transaction open across a multi-second HTTP request.
  const raw = await validateEmail(row.email);
  const parsed = parseValidationResult(raw);
  const status: string = parsed.isDisposable ? "disposable" : parsed.status;
  const isValid = status === "valid";

  // Claim-and-increment atomically. Two concurrent batches (e.g. the cron
  // tick overlapping a "Validate Now" click) can select the same pending
  // rows; the conditional updateMany ensures only the batch that actually
  // flips the row from pending bumps the job counters, and wrapping both in
  // one transaction guarantees the counter never drifts out of sync with the
  // row even if the process dies mid-write.
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.validationEmail.updateMany({
      where: { id: row.id, status: null },
      data: {
        status,
        score: Math.round(parsed.score),
        isDisposable: parsed.isDisposable,
        validatedAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      // Another batch already processed this row — don't double-count.
      return false;
    }

    await tx.validationJob.update({
      where: { id: row.jobId },
      data: {
        processedEmails: { increment: 1 },
        validEmails: isValid ? { increment: 1 } : undefined,
        status: "processing",
      },
    });

    return true;
  });
}

/**
 * Mark jobs whose every email has been processed as completed.
 */
export async function finalizeCompletedJobs(): Promise<void> {
  const activeJobs = await prisma.validationJob.findMany({
    where: { status: { in: ["pending", "processing"] } },
    select: { id: true },
  });

  for (const job of activeJobs) {
    const remaining = await prisma.validationEmail.count({
      where: { jobId: job.id, status: null },
    });
    if (remaining === 0) {
      await prisma.validationJob.update({
        where: { id: job.id },
        data: { status: "completed", completedAt: new Date() },
      });
    }
  }
}

/**
 * Process up to `batchSize` pending email rows. Used both by the in-process
 * loop and the cron driver. Returns counts for this batch.
 */
export async function runJobBatch(
  batchSize = BATCH_SIZE,
  jobId?: string
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}> {
  // Skip emails belonging to paused jobs so a paused job stops advancing
  // while others keep going.
  const excluded = Array.from(pausedJobs);
  const where = jobId
    ? { status: null, jobId }
    : excluded.length > 0
      ? { status: null, jobId: { notIn: excluded } }
      : { status: null };

  const batch = await prisma.validationEmail.findMany({
    where,
    select: { id: true, jobId: true, email: true },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of batch) {
    try {
      const claimed = await processValidationEmail(row);
      if (claimed) succeeded++;
      else skipped++; // already processed by a concurrent batch
    } catch (err) {
      failed++;
      console.error(
        `[validation-job-worker] failed for ${row.email}:`,
        err instanceof Error ? err.message : err
      );
    }
    processed++;
  }

  await finalizeCompletedJobs();

  return { processed, succeeded, failed, skipped };
}

async function tick(): Promise<{ processed: number; nextDelayMs: number }> {
  if (state.ticking) {
    return { processed: 0, nextDelayMs: INTERVAL_MS };
  }
  state.ticking = true;
  state.lastTickAt = new Date();

  try {
    const pending = await prisma.validationEmail.count({ where: { status: null } });
    if (pending === 0) {
      state.lastTickResult = { processed: 0, succeeded: 0, failed: 0 };
      return { processed: 0, nextDelayMs: IDLE_INTERVAL_MS };
    }

    const { processed, succeeded, failed } = await runJobBatch(BATCH_SIZE);

    state.totalProcessed += processed;
    state.totalSucceeded += succeeded;
    state.totalFailed += failed;
    state.lastTickResult = { processed, succeeded, failed };

    console.log(
      `[validation-job-worker] tick: ${succeeded}/${processed} validated (${failed} failed) · totals: ${state.totalSucceeded} ok / ${state.totalFailed} fail`
    );

    return { processed, nextDelayMs: INTERVAL_MS };
  } catch (err) {
    state.errors++;
    state.lastError = err instanceof Error ? err.message : String(err);
    console.error("[validation-job-worker] tick error:", err);
    return { processed: 0, nextDelayMs: INTERVAL_MS };
  } finally {
    state.ticking = false;
  }
}

async function loop() {
  while (state.running) {
    const { nextDelayMs } = await tick();
    if (!state.running) break;
    await new Promise((r) => setTimeout(r, nextDelayMs));
  }
}

export function startValidationJobWorker() {
  if (state.running) {
    console.log("[validation-job-worker] already running, skipping");
    return;
  }

  state.running = true;
  state.startedAt = new Date();
  console.log(
    `[validation-job-worker] starting — batch=${BATCH_SIZE}, interval=${INTERVAL_MS / 1000}s, idle=${IDLE_INTERVAL_MS / 1000}s`
  );

  if (globalThis.__validationJobWorkerTimer) {
    clearTimeout(globalThis.__validationJobWorkerTimer);
  }
  globalThis.__validationJobWorkerTimer = setTimeout(() => {
    loop().catch((err) => {
      state.running = false;
      state.lastError = err instanceof Error ? err.message : String(err);
      console.error("[validation-job-worker] loop exited unexpectedly:", err);
    });
  }, STARTUP_DELAY_MS);
}

export function stopValidationJobWorker() {
  state.running = false;
  if (globalThis.__validationJobWorkerTimer) {
    clearTimeout(globalThis.__validationJobWorkerTimer);
    globalThis.__validationJobWorkerTimer = undefined;
  }
  console.log("[validation-job-worker] stopped");
}
