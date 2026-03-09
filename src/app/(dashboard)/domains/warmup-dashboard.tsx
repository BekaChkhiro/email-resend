"use client";

import { useState, useTransition } from "react";
import {
  toggleWarmup,
  resetWarmup,
  type WarmupDomainStats,
} from "./warmup-actions";
import { WARMUP_DURATION_DAYS } from "@/lib/warmup-schedule";

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
    if (
      !confirm(
        `Are you sure you want to reset warmup for ${domainName}? This will delete all warmup emails for this domain.`
      )
    )
      return;

    setActionId(domainId);
    startTransition(async () => {
      const result = await resetWarmup(domainId);
      setActionId(null);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          title="Active Warmups"
          value={overview.activeCount}
          color="blue"
        />
        <OverviewCard
          title="Completed"
          value={overview.completedCount}
          color="green"
        />
        <OverviewCard
          title="Sent Today"
          value={overview.sentToday}
          color="purple"
        />
        <OverviewCard
          title="Total Sent"
          value={overview.totalSent}
          color="gray"
        />
      </div>

      {/* Domains Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Domain
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Day
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Today&apos;s Progress
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Overall Progress
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {domains.map((domain) => (
              <tr key={domain.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">
                    {domain.domain}
                  </div>
                  <div className="text-xs text-gray-500">{domain.fromEmail}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  {domain.isComplete ? (
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Completed
                    </span>
                  ) : domain.warmupEnabled ? (
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Active
                    </span>
                  ) : domain.warmupDay > 0 ? (
                    <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                      Paused
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                      Not Started
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {domain.warmupDay > 0 ? (
                    <span>
                      Day {domain.warmupDay} / {WARMUP_DURATION_DAYS}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {domain.warmupEnabled && !domain.isComplete ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              (domain.warmupSentToday / domain.dailyLimit) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {domain.warmupSentToday}/{domain.dailyLimit}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {domain.warmupDay > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full transition-all ${
                            domain.isComplete ? "bg-green-600" : "bg-blue-600"
                          }`}
                          style={{ width: `${domain.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {domain.progress}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    {!domain.isComplete && (
                      <button
                        onClick={() => handleToggle(domain.id)}
                        disabled={isPending && actionId === domain.id}
                        className={`rounded px-3 py-1 text-xs font-medium transition ${
                          domain.warmupEnabled
                            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        } disabled:opacity-50`}
                      >
                        {isPending && actionId === domain.id
                          ? "..."
                          : domain.warmupEnabled
                          ? "Pause"
                          : "Start"}
                      </button>
                    )}
                    {domain.warmupDay > 0 && (
                      <button
                        onClick={() => handleReset(domain.id, domain.domain)}
                        disabled={isPending && actionId === domain.id}
                        className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 disabled:opacity-50"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-medium text-blue-800">
          About Email Warmup
        </h3>
        <p className="mt-1 text-sm text-blue-700">
          Email warmup is a {WARMUP_DURATION_DAYS}-day process that gradually
          increases sending volume between your domains. This builds sender
          reputation and improves deliverability. Warmup emails are
          AI-generated professional business conversations that simulate real
          communication.
        </p>
        <p className="mt-2 text-xs text-blue-600">
          Tip: For best results, enable warmup on at least 2 domains at the same
          time so they can exchange emails with each other.
        </p>
      </div>
    </div>
  );
}

function OverviewCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: "blue" | "green" | "purple" | "gray";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    gray: "bg-gray-50 text-gray-700",
  };

  return (
    <div
      className={`rounded-lg border border-gray-200 p-4 ${colorClasses[color]}`}
    >
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
