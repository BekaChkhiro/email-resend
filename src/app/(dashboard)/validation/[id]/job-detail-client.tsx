"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, useToast } from "@/components/ui";
import {
  triggerJobBatch,
  pauseJobValidation,
  resumeJobValidation,
} from "@/app/actions/validation-jobs";

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
  initialPaused,
  initialBreakdown,
}: {
  jobId: string;
  initial: JobState;
  initialPaused: boolean;
  initialBreakdown: Breakdown;
}) {
  const router = useRouter();
  const toast = useToast();
  const [job, setJob] = useState<JobState>(initial);
  const [breakdown, setBreakdown] = useState<Breakdown>(initialBreakdown);
  const [paused, setPaused] = useState(initialPaused);
  const [isPending, startTransition] = useTransition();
  // True once the background worker has been kicked for this job (either the
  // user clicked Start, or processing is already underway from a prior visit).
  const [started, setStarted] = useState(
    initial.processedEmails > 0 || initial.status === "processing"
  );

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
      if (typeof data.paused === "boolean") setPaused(data.paused);
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

  function handleStart() {
    setStarted(true);
    setPaused(false);
    startTransition(async () => {
      try {
        const result = await triggerJobBatch(jobId, 5);
        toast(
          `Started — validated ${result.succeeded} so far. It now continues automatically.`,
          "success"
        );
        await refresh();
      } catch {
        toast("Failed to start validation.", "error");
      }
    });
  }

  function handlePause() {
    setPaused(true);
    startTransition(async () => {
      try {
        await pauseJobValidation(jobId);
        toast("Paused. The job will stop after the current batch.", "info");
        await refresh();
      } catch {
        toast("Failed to pause.", "error");
        setPaused(false);
      }
    });
  }

  function handleResume() {
    setPaused(false);
    setStarted(true);
    startTransition(async () => {
      try {
        await resumeJobValidation(jobId);
        toast("Resumed — continuing automatically.", "success");
        await refresh();
      } catch {
        toast("Failed to resume.", "error");
        setPaused(true);
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
              {done ? "Validation complete" : paused ? "Paused" : "Validating"}
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
          {!done &&
            (paused ? (
              <Button onClick={handleResume} isLoading={isPending} loadingText="Resuming...">
                Resume
              </Button>
            ) : !started ? (
              <Button onClick={handleStart} isLoading={isPending} loadingText="Starting...">
                Start validation
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  Processing automatically
                </div>
                <Button
                  variant="secondary"
                  onClick={handlePause}
                  isLoading={isPending}
                  loadingText="Pausing..."
                >
                  Pause
                </Button>
              </div>
            ))}
        </div>
        {!done && started && !paused && (
          <p className="mt-2 text-xs text-gray-400 dark:text-zinc-500">
            Running in the background — ~5 emails every 2 minutes. You can close
            this tab; it keeps going on the server.
          </p>
        )}
        {!done && paused && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Paused — no new emails are being validated. Click Resume to continue.
          </p>
        )}
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
