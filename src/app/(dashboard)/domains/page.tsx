import Link from "next/link";
import { prisma } from "@/lib/db";
import DomainsTable from "./domains-table";

export default async function DomainsPage() {
  const domains = await prisma.domain.findMany({
    orderBy: { domain: "asc" },
  });

  const activeCount = domains.filter((d) => d.isActive).length;
  const warmupActiveCount = await prisma.domain.count({
    where: { warmupEnabled: true },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Domains
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Manage your sending domains for email distribution
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="flex items-center gap-4 rounded-lg bg-white px-4 py-2.5 shadow-sm ring-1 ring-gray-200 dark:bg-zinc-800 dark:ring-zinc-700">
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {domains.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Total</p>
            </div>
            <div className="h-5 w-px bg-gray-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {activeCount}
              </p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Active</p>
            </div>
          </div>

          {/* Warmup Button */}
          <Link
            href="/domains/warmup"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-orange-600 hover:to-amber-600"
          >
            <FlameIcon className="h-4 w-4" />
            <span>Warmup Dashboard</span>
            {warmupActiveCount > 0 && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {warmupActiveCount} active
              </span>
            )}
          </Link>
        </div>
      </div>

      <DomainsTable domains={domains} />
    </div>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
    </svg>
  );
}
