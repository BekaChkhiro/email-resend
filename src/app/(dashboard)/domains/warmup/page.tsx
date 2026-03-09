import Link from "next/link";
import { getWarmupStats, getWarmupOverview } from "../warmup-actions";
import WarmupDashboard from "../warmup-dashboard";

export default async function WarmupPage() {
  const [domains, overview] = await Promise.all([
    getWarmupStats(),
    getWarmupOverview(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/domains"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Domains
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-amber-500">
            <FlameIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Email Warmup
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Build sender reputation by gradually increasing email volume
            </p>
          </div>
        </div>
      </div>

      <WarmupDashboard domains={domains} overview={overview} />
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
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
