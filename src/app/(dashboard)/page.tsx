import { prisma } from "@/lib/db";
import Link from "next/link";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sending: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
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

  // Aggregate stats across all campaigns
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
  const totalClicked = allEmails.filter(
    (e) => e.status === "clicked"
  ).length;
  const totalBounced = allEmails.filter(
    (e) => e.status === "bounced"
  ).length;

  const avgOpenRate =
    totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0.0";
  const avgClickRate =
    totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0.0";

  const activeCampaigns = campaigns.filter(
    (c) => c.status === "sending"
  ).length;
  const completedCampaigns = campaigns.filter(
    (c) => c.status === "completed"
  ).length;

  const overviewMetrics = [
    { label: "Total Campaigns", value: campaigns.length },
    { label: "Active", value: activeCampaigns },
    { label: "Completed", value: completedCampaigns },
    { label: "Emails Sent", value: totalSent },
    { label: "Delivered", value: totalDelivered },
    { label: "Open Rate", value: `${avgOpenRate}%` },
    { label: "Click Rate", value: `${avgClickRate}%` },
    { label: "Bounced", value: totalBounced },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your email campaigns.
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {overviewMetrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <p className="text-xs font-medium text-gray-500">{m.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign List with Stats */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Campaigns
          </h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No campaigns yet.{" "}
            <Link
              href="/campaigns"
              className="text-blue-600 hover:text-blue-800"
            >
              Create one
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Emails
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Open Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Click Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Bounced
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.map((campaign) => {
                  const emails = campaign.emails;
                  const cSent = emails.filter(
                    (e) =>
                      e.status !== "pending" && e.status !== "failed"
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
                    cSent > 0
                      ? ((cOpened / cSent) * 100).toFixed(1)
                      : "—";
                  const cClickRate =
                    cSent > 0
                      ? ((cClicked / cSent) * 100).toFixed(1)
                      : "—";

                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {campaign.name}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {campaign.subject}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[campaign.status] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {cSent}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {cOpenRate === "—" ? "—" : `${cOpenRate}%`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {cClickRate === "—" ? "—" : `${cClickRate}%`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {cBounced}
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
