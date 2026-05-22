"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const REFRESH_MS = 20000;
const RATE_PER_HOUR = 150;

function formatEta(remaining: number): string {
  if (remaining <= 0) return "Complete";
  const hours = remaining / RATE_PER_HOUR;
  if (hours < 1) return `~${Math.ceil(hours * 60)} min`;
  if (hours < 24) return `~${Math.ceil(hours)} h`;
  return `~${(hours / 24).toFixed(1)} days`;
}

export default function ValidationStatus({
  total,
  verified,
  remaining,
}: {
  total: number;
  verified: number;
  remaining: number;
}) {
  const router = useRouter();
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(REFRESH_MS / 1000);

  useEffect(() => {
    if (remaining <= 0) return;
    const refreshTimer = setInterval(() => {
      router.refresh();
      setSecondsUntilRefresh(REFRESH_MS / 1000);
    }, REFRESH_MS);
    const tickTimer = setInterval(() => {
      setSecondsUntilRefresh((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      clearInterval(refreshTimer);
      clearInterval(tickTimer);
    };
  }, [router, remaining]);

  if (remaining <= 0) return null;

  const percent = total > 0 ? (verified / total) * 100 : 0;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Background validation active
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {verified.toLocaleString()} of {total.toLocaleString()} verified
              <span className="mx-1.5 text-blue-400">·</span>
              {remaining.toLocaleString()} remaining
              <span className="mx-1.5 text-blue-400">·</span>
              ETA {formatEta(remaining)}
            </p>
          </div>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Auto-refresh in {secondsUntilRefresh}s
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}
