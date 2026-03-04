import { prisma } from "@/lib/db";
import DomainsTable from "./domains-table";

export default async function DomainsPage() {
  const domains = await prisma.domain.findMany({
    orderBy: { domain: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Domains</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your 5 sending domains for round-robin email distribution.
        </p>
      </div>

      <DomainsTable domains={domains} />
    </div>
  );
}
