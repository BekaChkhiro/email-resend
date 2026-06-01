"use server";

import { revalidatePath } from "next/cache";
import {
  runJobBatch,
  startValidationJobWorker,
  pauseJob as pauseJobInWorker,
  resumeJob as resumeJobInWorker,
} from "@/lib/validation-job-worker";

/**
 * Start (or resume) validation for a job: make sure the long-lived background
 * worker is running in this server process — so processing continues
 * automatically every couple of minutes without the user clicking again — and
 * run one batch immediately so the first results show up right away.
 *
 * startValidationJobWorker() is idempotent (a no-op if already running), so
 * clicking the button repeatedly is safe.
 */
export async function triggerJobBatch(
  jobId: string,
  batchSize = 5
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}> {
  resumeJobInWorker(jobId); // clear any prior pause
  startValidationJobWorker();
  const result = await runJobBatch(batchSize, jobId);
  revalidatePath(`/validation/${jobId}`);
  return result;
}

/**
 * Pause a job: the background worker stops picking up this job's pending
 * emails (others keep going). A batch already in flight finishes first.
 */
export async function pauseJobValidation(jobId: string): Promise<void> {
  pauseJobInWorker(jobId);
  revalidatePath(`/validation/${jobId}`);
}

/**
 * Resume a paused job: clear the pause, make sure the worker is running, and
 * kick a batch immediately.
 */
export async function resumeJobValidation(jobId: string): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}> {
  resumeJobInWorker(jobId);
  startValidationJobWorker();
  const result = await runJobBatch(5, jobId);
  revalidatePath(`/validation/${jobId}`);
  return result;
}
