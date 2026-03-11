"use client";

import { useState } from "react";

type EmailData = {
  id: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  errorMessage: string | null;
  contactName: string;
  contactEmail: string;
  domainFrom: string;
  templateName: string;
};

type CampaignAnalyticsProps = {
  campaignName: string;
  sentAt: string | null;
  emails: EmailData[];
};

const statusStyles: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  opened: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  clicked: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  bounced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}

export default function CampaignAnalytics({
  emails,
}: CampaignAnalyticsProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // If no emails, show empty state
  if (emails.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Campaign Analytics
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No email data available yet. Emails will appear here once the campaign starts sending.
        </p>
      </div>
    );
  }

  const total = emails.length;
  const sent = emails.filter(
    (e) => e.status !== "pending" && e.status !== "failed"
  ).length;
  const delivered = emails.filter((e) =>
    ["delivered", "opened", "clicked"].includes(e.status)
  ).length;
  const opened = emails.filter((e) =>
    ["opened", "clicked"].includes(e.status)
  ).length;
  const clicked = emails.filter((e) => e.status === "clicked").length;
  const bounced = emails.filter((e) => e.status === "bounced").length;
  const failed = emails.filter((e) => e.status === "failed").length;

  const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : "0.0";
  const clickRate = sent > 0 ? ((clicked / sent) * 100).toFixed(1) : "0.0";
  const deliverRate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : "0.0";
  const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : "0.0";

  const metrics = [
    { label: "Total Emails", value: total, color: "text-gray-900 dark:text-white" },
    { label: "Sent", value: sent, color: "text-emerald-600 dark:text-emerald-400" },
    {
      label: "Delivered",
      value: `${delivered} (${deliverRate}%)`,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Opened",
      value: `${opened} (${openRate}%)`,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "Clicked",
      value: `${clicked} (${clickRate}%)`,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Bounced",
      value: `${bounced} (${bounceRate}%)`,
      color: "text-red-600 dark:text-red-400",
    },
    { label: "Failed", value: failed, color: "text-red-600 dark:text-red-400" },
  ];

  const filteredEmails =
    statusFilter === "all"
      ? emails
      : emails.filter((e) => e.status === statusFilter);

  const statuses = ["all", "pending", "sent", "delivered", "opened", "clicked", "bounced", "failed"];

  return (
    <div className="mt-6 space-y-6">
      {/* Metrics Cards */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Campaign Analytics
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{m.label}</p>
              <p className={`mt-1 text-xl font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Email Details Table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Email Details ({filteredEmails.length})
          </h2>
          <div className="flex gap-1">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredEmails.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No emails match the selected filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Sent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Opened
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Clicked
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Domain
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Template
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {email.contactName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {email.contactEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[email.status] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}
                      >
                        {email.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400" suppressHydrationWarning>
                      {formatDate(email.sentAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400" suppressHydrationWarning>
                      {formatDate(email.openedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400" suppressHydrationWarning>
                      {formatDate(email.clickedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {email.domainFrom}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {email.templateName}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-600 dark:text-red-400">
                      {email.errorMessage ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
