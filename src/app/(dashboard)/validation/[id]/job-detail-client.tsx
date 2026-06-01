"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, useToast } from "@/components/ui";
import { triggerJobBatch } from "@/app/actions/validation-jobs";

const POLL_MS = 15000;
const RATE_PER_HOUR = 150;

type JobState = {
  status: string;
  totalEmails: number;
  processedEmails: number;
  validEmails: number;
};

type Breakdown = Record<string, number>;

const BREAKDOWN_STYLES: Record<string, string> = {
  valid: "text-emerald-700 dark:text-emerald-400",
  "catch-all": "text-amber-700 dark:text-amber-400",
  unknown: "text-gray-600 dark:text-zinc-400",
  invalid: "text-red-700 dark:text-red-400",
  disposable: "text-orange-700 dark:text-orange-400",
  pending: "text-gray-400 dark:text-zinc-500",
};

const BREAKDOWN_ORDER = ["valid", "catch-all", "unknown", "invalid", "disposable", "pending"];

function formatEta(remaining: number): string {
  if (remaining <= 0) return "Complete";
  const hours = remaining / RATE_PER_HOUR;
  if (hours < 1) return `~${Math.ceil(hours * 60)} min`;
  if (hours < 24) return `~${Math.ceil(hours)} h`;
  return `~${(hours / 24).toFixed(1)} days`;
}

export default function JobDetailClient({
  jobId,
  initial,
  initialBreakdown,
}: {
  jobId: string;
  initial: JobState;
  initialBreakdown: Breakdown;
}) {
  const router = useRouter();
  const toast = useToast();
  const [job, setJob] = useState<JobState>(initial);
  const [breakdown, setBreakdown] = useState<Breakdown>(initialBreakdown);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/validation/jobs/${jobId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setJob({
        status: data.job.status,
        totalEmails: data.job.totalEmails,
        processedEmails: data.job.processedEmails,
        validEmails: data.job.validEmails,
      });
      setBreakdown(data.breakdown);
    } catch {
      /* ignore transient poll errors */
    }
  }, [jobId]);

  const remaining = Math.max(0, job.totalEmails - job.processedEmails);
  const percent =
    job.totalEmails > 0 ? Math.round((job.processedEmails / job.totalEmails) * 100) : 0;
  // "completed" is the server's ground truth (it counts remaining pending
  // rows), so trust it even if the cached counters drift; otherwise fall back
  // to the counter comparison for an immediate signal after a manual batch.
  const done =
    job.status === "completed" || (job.totalEmails > 0 && remaining === 0);

  // Poll the job while it is still running; stop once everything is processed.
  useEffect(() => {
    if (done) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, done]);

  function handleValidateNow() {
    startTransition(async () => {
      try {
        const result = await triggerJobBatch(jobId, 5);
        toast(`Validated ${result.succeeded} of ${result.processed} in this batch.`, "success");
        await refresh();
      } catch {
        toast("Failed to run validation batch.", "error");
      }
    });
  }

  async function handleDelete() {
    if (!confirm("Delete this validation job and all its data?")) return;
    const res = await fetch(`/api/validation/jobs/${jobId}`, { method: "DELETE" });
    if (res.ok) router.push("/validation");
    else toast("Failed to delete job.", "error");
  }

  return (
    <div className="space-y-6">
      {/* Progress card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
              {done ? "Validation complete" : "Validating"}
              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-zinc-500">
                {job.status}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
              {job.processedEmails.toLocaleString()} of {job.totalEmails.toLocaleString()}{" "}
              processed
              {!done && (
                <>
                  <span className="mx-1.5 text-gray-300 dark:text-zinc-600">·</span>
                  {remaining.toLocaleString()} remaining
                  <span className="mx-1.5 text-gray-300 dark:text-zinc-600">·</span>
                  ETA {formatEta(remaining)}
                </>
              )}
            </p>
          </div>
          {!done && (
            <Button
              variant="secondary"
              onClick={handleValidateNow}
              isLoading={isPending}
              loadingText="Running..."
            >
              Validate Now (5)
            </Button>
          )}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {BREAKDOWN_ORDER.map((key) => (
          <div
            key={key}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-zinc-500">
              {key === "catch-all" ? "Catch-all" : key.charAt(0).toUpperCase() + key.slice(1)}
            </p>
            <p className={`mt-1 text-xl font-semibold ${BREAKDOWN_STYLES[key]}`}>
              {(breakdown[key] ?? 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
          Export valid emails
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
          {job.validEmails.toLocaleString()} valid {job.validEmails === 1 ? "email" : "emails"}{" "}
          ready to export.
          {!done && " Validation is still running — you can export now or wait until it finishes."}
        </p>
        <div className="mt-3 flex gap-3">
          <a
            href={`/api/validation/jobs/${jobId}/export?format=csv`}
            className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Export CSV
          </a>
          <a
            href={`/api/validation/jobs/${jobId}/export?format=xlsx`}
            className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Export Excel
          </a>
        </div>
      </div>

      <div>
        <button
          onClick={handleDelete}
          className="text-xs text-red-600 hover:underline dark:text-red-400"
        >
          Delete this job
        </button>
      </div>
    </div>
  );
}
