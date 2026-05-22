/**
 * Background email validation worker.
 *
 * Runs inside the Next.js server process. Pulls unverified contacts from
 * the DB in batches and calls the email validator service for each, then
 * writes the result back. Designed to run continuously for the lifetime
 * of the process.
 *
 * Architecture:
 *   - One tick = process up to BATCH_SIZE unverified contacts
 *   - Sequential per batch (so we stay under the validator's 5/min limit)
 *   - Sleeps INTERVAL_MS between batches when there's still work
 *   - Sleeps IDLE_INTERVAL_MS when there's nothing left to do
 *   - Single-flight: if a tick is already running, skip the next tick
 */

import { prisma } from "./db";
import { validateEmail, parseValidationResult } from "./emailValidator";

const BATCH_SIZE = 5;
const INTERVAL_MS = 120_000; // 2 minutes between active batches
const IDLE_INTERVAL_MS = 300_000; // 5 minutes when no work
const STARTUP_DELAY_MS = 15_000; // wait for server to fully boot

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

// Global state survives Hot-Reload in dev by anchoring on globalThis.
declare global {
  var __validationWorker: WorkerState | undefined;
  var __validationWorkerTimer: NodeJS.Timeout | undefined;
}

const state: WorkerState =
  globalThis.__validationWorker ?? {
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

globalThis.__validationWorker = state;

export function getWorkerState(): Readonly<WorkerState> {
  return { ...state };
}

async function tick(): Promise<{ processed: number; nextDelayMs: number }> {
  if (state.ticking) {
    return { processed: 0, nextDelayMs: INTERVAL_MS };
  }
  state.ticking = true;
  state.lastTickAt = new Date();

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    const batch = await prisma.contact.findMany({
      where: { OR: [{ emailStatus: null }, { emailStatus: "" }] },
      select: { id: true, email: true },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) {
      state.lastTickResult = { processed: 0, succeeded: 0, failed: 0 };
      return { processed: 0, nextDelayMs: IDLE_INTERVAL_MS };
    }

    for (const contact of batch) {
      try {
        const raw = await validateEmail(contact.email);
        const parsed = parseValidationResult(raw);
        const status: string = parsed.isDisposable ? "disposable" : parsed.status;
        await prisma.contact.update({
          where: { id: contact.id },
          data: { emailStatus: status },
        });
        succeeded++;
      } catch (err) {
        failed++;
        console.error(
          `[validation-worker] failed for ${contact.email}:`,
          err instanceof Error ? err.message : err
        );
      }
      processed++;
    }

    state.totalProcessed += processed;
    state.totalSucceeded += succeeded;
    state.totalFailed += failed;
    state.lastTickResult = { processed, succeeded, failed };

    console.log(
      `[validation-worker] tick: ${succeeded}/${processed} validated (${failed} failed) · totals: ${state.totalSucceeded} ok / ${state.totalFailed} fail`
    );

    return { processed, nextDelayMs: INTERVAL_MS };
  } catch (err) {
    state.errors++;
    state.lastError = err instanceof Error ? err.message : String(err);
    console.error("[validation-worker] tick error:", err);
    return { processed, nextDelayMs: INTERVAL_MS };
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

export function startValidationWorker() {
  if (state.running) {
    console.log("[validation-worker] already running, skipping");
    return;
  }

  state.running = true;
  state.startedAt = new Date();
  console.log(
    `[validation-worker] starting — batch=${BATCH_SIZE}, interval=${INTERVAL_MS / 1000}s, idle=${IDLE_INTERVAL_MS / 1000}s`
  );

  // Delay the first tick so the rest of the server has time to initialize
  // (Prisma client, env, etc.). After that, run the loop forever.
  if (globalThis.__validationWorkerTimer) {
    clearTimeout(globalThis.__validationWorkerTimer);
  }
  globalThis.__validationWorkerTimer = setTimeout(() => {
    loop().catch((err) => {
      state.running = false;
      state.lastError = err instanceof Error ? err.message : String(err);
      console.error("[validation-worker] loop exited unexpectedly:", err);
    });
  }, STARTUP_DELAY_MS);
}

export function stopValidationWorker() {
  state.running = false;
  if (globalThis.__validationWorkerTimer) {
    clearTimeout(globalThis.__validationWorkerTimer);
    globalThis.__validationWorkerTimer = undefined;
  }
  console.log("[validation-worker] stopped");
}
