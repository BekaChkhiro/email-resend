import { prisma } from "@/lib/db";
import Link from "next/link";

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  draft: {
    bg: "bg-gray-100 dark:bg-zinc-700",
    text: "text-gray-700 dark:text-gray-300",
    dot: "bg-gray-400",
  },
  sending: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500 animate-pulse",
  },
  completed: {
    bg: "bg-green-50 dark:bg-green-500/10",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
  },
  paused: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
};

export default async function DashboardPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { emails: true } },
      emails: {
        select: { status: true },
      },
    },
  });

  const allEmails = campaigns.flatMap((c) => c.emails);
  const totalSent = allEmails.filter(
    (e) => e.status !== "pending" && e.status !== "failed"
  ).length;
  const totalDelivered = allEmails.filter((e) =>
    ["delivered", "opened", "clicked"].includes(e.status)
  ).length;
  const totalOpened = allEmails.filter((e) =>
    ["opened", "clicked"].includes(e.status)
  ).length;
  const totalClicked = allEmails.filter((e) => e.status === "clicked").length;
  const totalBounced = allEmails.filter((e) => e.status === "bounced").length;

  const avgOpenRate =
    totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0.0";
  const avgClickRate =
    totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0.0";

  const activeCampaigns = campaigns.filter((c) => c.status === "sending").length;
  const completedCampaigns = campaigns.filter((c) => c.status === "completed").length;

  const metrics = [
    {
      label: "Total Campaigns",
      value: campaigns.length,
      icon: FolderIcon,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      label: "Active",
      value: activeCampaigns,
      icon: PlayIcon,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      label: "Emails Sent",
      value: totalSent.toLocaleString(),
      icon: SendIcon,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-500/10",
    },
    {
      label: "Delivered",
      value: totalDelivered.toLocaleString(),
      icon: CheckCircleIcon,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-500/10",
    },
    {
      label: "Open Rate",
      value: `${avgOpenRate}%`,
      icon: EyeIcon,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-50 dark:bg-cyan-500/10",
    },
    {
      label: "Click Rate",
      value: `${avgClickRate}%`,
      icon: CursorIcon,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-500/10",
    },
    {
      label: "Bounced",
      value: totalBounced,
      icon: AlertIcon,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-500/10",
    },
    {
      label: "Completed",
      value: completedCampaigns,
      icon: CheckIcon,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-50 dark:bg-teal-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Overview of your email campaigns
          </p>
        </div>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          <PlusIcon className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="group rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
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

      {/* Campaigns Table */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Campaigns
          </h2>
          <Link
            href="/campaigns"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            View all
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700">
              <FolderIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
              No campaigns yet
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              Get started by creating your first campaign.
            </p>
            <Link
              href="/campaigns"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              <PlusIcon className="h-4 w-4" />
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Open Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Click Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Bounced
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                {campaigns.slice(0, 5).map((campaign) => {
                  const emails = campaign.emails;
                  const cSent = emails.filter(
                    (e) => e.status !== "pending" && e.status !== "failed"
                  ).length;
                  const cOpened = emails.filter((e) =>
                    ["opened", "clicked"].includes(e.status)
                  ).length;
                  const cClicked = emails.filter(
                    (e) => e.status === "clicked"
                  ).length;
                  const cBounced = emails.filter(
                    (e) => e.status === "bounced"
                  ).length;
                  const cOpenRate =
                    cSent > 0 ? ((cOpened / cSent) * 100).toFixed(1) : null;
                  const cClickRate =
                    cSent > 0 ? ((cClicked / cSent) * 100).toFixed(1) : null;

                  const status = statusConfig[campaign.status] ?? statusConfig.draft;

                  return (
                    <tr
                      key={campaign.id}
                      className="group transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="block"
                        >
                          <p className="font-medium text-gray-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                            {campaign.name}
                          </p>
                          <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">
                            {campaign.subject}
                          </p>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                          />
                          {campaign.status.charAt(0).toUpperCase() +
                            campaign.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {cSent.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {cOpenRate ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-600">
                              <div
                                className="h-full rounded-full bg-cyan-500"
                                style={{ width: `${Math.min(parseFloat(cOpenRate), 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-zinc-300">
                              {cOpenRate}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-zinc-500">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {cClickRate ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-600">
                              <div
                                className="h-full rounded-full bg-orange-500"
                                style={{ width: `${Math.min(parseFloat(cClickRate), 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-zinc-300">
                              {cClickRate}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-zinc-500">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-medium ${
                            cBounced > 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-500 dark:text-zinc-400"
                          }`}
                        >
                          {cBounced}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Icons
function FolderIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function SendIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CursorIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
    </svg>
  );
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
