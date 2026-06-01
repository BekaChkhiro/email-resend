"use server";

import { revalidatePath } from "next/cache";
import { runJobBatch } from "@/lib/validation-job-worker";

/**
 * Process one batch of pending emails for a specific job immediately, without
 * waiting for the next cron tick. Used by the "Validate Now" button so the
 * user sees movement on the job they're viewing. The cron continues in
 * parallel across all jobs.
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
  const result = await runJobBatch(batchSize, jobId);
  revalidatePath(`/validation/${jobId}`);
  return result;
}
