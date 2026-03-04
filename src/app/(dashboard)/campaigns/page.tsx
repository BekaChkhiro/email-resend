import { prisma } from "@/lib/db";
import CampaignsTable from "./campaigns-table";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { templates: true } } },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create and manage email campaigns.
        </p>
      </div>

      <CampaignsTable campaigns={campaigns} />
    </div>
  );
}
