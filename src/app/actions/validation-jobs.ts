"use server";

import { revalidatePath } from "next/cache";
import { runJobBatch, startValidationJobWorker } from "@/lib/validation-job-worker";

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
  startValidationJobWorker();
  const result = await runJobBatch(batchSize, jobId);
  revalidatePath(`/validation/${jobId}`);
  return result;
}
