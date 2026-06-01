/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * We use it to spawn a long-lived background worker that validates a batch
 * of unverified contacts every two minutes. No external cron needed; the
 * loop runs for the lifetime of the Railway process.
 *
 * Disable by setting ENABLE_VALIDATION_WORKER=false.
 */
export async function register() {
  // Only run in Node.js runtime (not Edge); Prisma needs Node.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Don't start during build / static analysis.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Allow opting out via env var.
  if (process.env.ENABLE_VALIDATION_WORKER === "false") {
    console.log("[validation-worker] disabled via ENABLE_VALIDATION_WORKER=false");
    return;
  }

  const { startValidationWorker } = await import("./src/lib/validation-worker");
  startValidationWorker();

  // Standalone CSV-validation jobs (the /validation tool). Separate queue
  // from the contacts validator above; shares the same external API, so a
  // throttled request just fails the row and it retries on the next tick.
  if (process.env.ENABLE_VALIDATION_JOB_WORKER !== "false") {
    const { startValidationJobWorker } = await import("./src/lib/validation-job-worker");
    startValidationJobWorker();
  } else {
    console.log("[validation-job-worker] disabled via ENABLE_VALIDATION_JOB_WORKER=false");
  }

  if (process.env.ENABLE_WARMUP_WORKER !== "false") {
    const { startWarmupWorker } = await import("./src/lib/warmup-worker");
    startWarmupWorker();
  } else {
    console.log("[warmup] disabled via ENABLE_WARMUP_WORKER=false");
  }
}
