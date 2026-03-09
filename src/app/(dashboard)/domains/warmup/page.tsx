import Link from "next/link";
import { getWarmupStats, getWarmupOverview } from "../warmup-actions";
import WarmupDashboard from "../warmup-dashboard";

export default async function WarmupPage() {
  const [domains, overview] = await Promise.all([
    getWarmupStats(),
    getWarmupOverview(),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/domains"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              &larr; Domains
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Email Warmup
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Build sender reputation by gradually increasing email volume between
            your domains.
          </p>
        </div>
      </div>

      <WarmupDashboard domains={domains} overview={overview} />
    </div>
  );
}
