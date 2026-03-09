"use client";

import { useState, useTransition } from "react";
import {
  toggleWarmup,
  resetWarmup,
  type WarmupDomainStats,
} from "./warmup-actions";
import { WARMUP_DURATION_DAYS } from "@/lib/warmup-schedule";
import { Button, useConfirmDialog } from "@/components/ui";

interface OverviewStats {
  activeCount: number;
  completedCount: number;
  sentToday: number;
  totalSent: number;
}

interface WarmupDashboardProps {
  domains: WarmupDomainStats[];
  overview: OverviewStats;
}

export default function WarmupDashboard({
  domains,
  overview,
}: WarmupDashboardProps) {
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const { confirm, Dialog } = useConfirmDialog();

  async function handleToggle(domainId: string) {
    setActionId(domainId);
    startTransition(async () => {
      const result = await toggleWarmup(domainId);
      setActionId(null);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  async function handleReset(domainId: string, domainName: string) {
    const confirmed = await confirm({
      title: "Reset Warmup",
      message: `Are you sure you want to reset warmup for ${domainName}? This will delete all warmup emails for this domain.`,
      confirmLabel: "Reset",
      variant: "danger",
    });
    if (!confirmed) return;

    setActionId(domainId);
    startTransition(async () => {
      const result = await resetWarmup(domainId);
      setActionId(null);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  const metrics = [
    {
      label: "Active Warmups",
      value: overview.activeCount,
      icon: FlameIcon,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-500/10",
    },
    {
      label: "Completed",
      value: overview.completedCount,
      icon: CheckIcon,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-500/10",
    },
    {
      label: "Sent Today",
      value: overview.sentToday,
      icon: SendIcon,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-500/10",
    },
    {
      label: "Total Sent",
      value: overview.totalSent,
      icon: MailIcon,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <div
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${m.bg}`}
            >
              <m.icon className={`h-4 w-4 ${m.color}`} />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {m.value}
              </p>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">
                {m.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Domains Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-zinc-700 dark:bg-zinc-800/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Day
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Today&apos;s Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Overall Progress
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
              {domains.map((domain) => (
                <tr
                  key={domain.id}
                  className="group transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                >
                  {/* Domain */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-amber-500">
                        <GlobeIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {domain.domain}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-zinc-400">
                          {domain.fromEmail}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    {domain.isComplete ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Completed
                      </span>
                    ) : domain.warmupEnabled ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
                        Active
                      </span>
                    ) : domain.warmupDay > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Paused
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-zinc-700 dark:text-zinc-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        Not Started
                      </span>
                    )}
                  </td>

                  {/* Day */}
                  <td className="px-6 py-4">
                    {domain.warmupDay > 0 ? (
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Day {domain.warmupDay}{" "}
                        <span className="text-gray-400 dark:text-zinc-500">
                          / {WARMUP_DURATION_DAYS}
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-zinc-500">
                        —
                      </span>
                    )}
                  </td>

                  {/* Today's Progress */}
                  <td className="px-6 py-4">
                    {domain.warmupEnabled && !domain.isComplete ? (
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500 transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                (domain.warmupSentToday / domain.dailyLimit) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-zinc-300">
                          {domain.warmupSentToday}/{domain.dailyLimit}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-zinc-500">
                        —
                      </span>
                    )}
                  </td>

                  {/* Overall Progress */}
                  <td className="px-6 py-4">
                    {domain.warmupDay > 0 ? (
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700">
                          <div
                            className={`h-full rounded-full transition-all ${
                              domain.isComplete
                                ? "bg-green-500"
                                : "bg-gradient-to-r from-orange-400 to-amber-500"
                            }`}
                            style={{ width: `${domain.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-zinc-300">
                          {domain.progress}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-zinc-500">
                        —
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {!domain.isComplete && (
                        <Button
                          variant={domain.warmupEnabled ? "secondary" : "primary"}
                          size="xs"
                          onClick={() => handleToggle(domain.id)}
                          disabled={isPending && actionId === domain.id}
                          isLoading={isPending && actionId === domain.id}
                          leftIcon={
                            domain.warmupEnabled ? (
                              <PauseIcon className="h-3.5 w-3.5" />
                            ) : (
                              <PlayIcon className="h-3.5 w-3.5" />
                            )
                          }
                        >
                          {domain.warmupEnabled ? "Pause" : "Start"}
                        </Button>
                      )}
                      {domain.warmupDay > 0 && (
                        <Button
                          variant="danger"
                          size="xs"
                          onClick={() => handleReset(domain.id, domain.domain)}
                          disabled={isPending && actionId === domain.id}
                          leftIcon={<ResetIcon className="h-3.5 w-3.5" />}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-5 dark:border-orange-500/20 dark:from-orange-500/10 dark:to-amber-500/10">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/20">
            <InfoIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-medium text-orange-900 dark:text-orange-300">
              About Email Warmup
            </h3>
            <p className="mt-1 text-sm text-orange-800 dark:text-orange-200/80">
              Email warmup is a {WARMUP_DURATION_DAYS}-day process that
              gradually increases sending volume between your domains. This
              builds sender reputation and improves deliverability.
            </p>
            <p className="mt-2 text-xs text-orange-700 dark:text-orange-300/70">
              Tip: For best results, enable warmup on at least 2 domains so
              they can exchange emails with each other.
            </p>
          </div>
        </div>
      </div>

      <Dialog />
    </div>
  );
}

// Icons
function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
  );
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}
