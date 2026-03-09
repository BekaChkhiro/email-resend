import { prisma } from "@/lib/db";
import CampaignsTable from "./campaigns-table";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { templates: true } } },
  });

  const draftCount = campaigns.filter((c) => c.status === "draft").length;
  const sendingCount = campaigns.filter((c) => c.status === "sending").length;
  const completedCount = campaigns.filter((c) => c.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Create and manage email campaigns
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-lg bg-white px-4 py-2.5 shadow-sm ring-1 ring-gray-200 dark:bg-zinc-800 dark:ring-zinc-700">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {campaigns.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Total</p>
          </div>
          <div className="h-5 w-px bg-gray-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-gray-500 dark:text-zinc-400">
              {draftCount}
            </p>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Draft</p>
          </div>
          <div className="h-5 w-px bg-gray-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              {sendingCount}
            </p>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Sending</p>
          </div>
          <div className="h-5 w-px bg-gray-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {completedCount}
            </p>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Done</p>
          </div>
        </div>
      </div>

      <CampaignsTable campaigns={campaigns} />
    </div>
  );
}
