import Link from "next/link";
import { prisma } from "@/lib/db";
import DomainsTable from "./domains-table";

export default async function DomainsPage() {
  const domains = await prisma.domain.findMany({
    orderBy: { domain: "asc" },
  });

  const warmupActiveCount = await prisma.domain.count({
    where: { warmupEnabled: true },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domains</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your 5 sending domains for round-robin email distribution.
          </p>
        </div>
        <Link
          href="/domains/warmup"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <span>Warmup Dashboard</span>
          {warmupActiveCount > 0 && (
            <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs">
              {warmupActiveCount} active
            </span>
          )}
        </Link>
      </div>

      <DomainsTable domains={domains} />
    </div>
  );
}
