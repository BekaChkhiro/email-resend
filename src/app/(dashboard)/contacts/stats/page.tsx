import Link from "next/link";
import { prisma } from "@/lib/db";
import StatusDonut from "./status-donut";
import Timeline from "./timeline";

export const dynamic = "force-dynamic";

const ROLE_BASED_PREFIXES = [
  "info",
  "admin",
  "support",
  "sales",
  "contact",
  "hello",
  "help",
  "office",
  "marketing",
  "press",
  "billing",
  "noreply",
  "no-reply",
  "donotreply",
  "team",
  "service",
  "feedback",
  "abuse",
  "postmaster",
  "webmaster",
];

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "live.com",
  "mail.ru",
  "yandex.com",
  "yandex.ru",
  "protonmail.com",
  "proton.me",
  "gmx.com",
  "gmx.net",
  "zoho.com",
  "msn.com",
  "yahoo.co.uk",
  "me.com",
  "mac.com",
]);

const RATE_PER_HOUR = 150; // 5 emails per 2 minutes = 150/hour

function formatEta(remaining: number): string {
  if (remaining <= 0) return "Complete";
  const hours = remaining / RATE_PER_HOUR;
  if (hours < 1) return `~${Math.ceil(hours * 60)} min`;
  if (hours < 24) return `~${Math.ceil(hours)} h`;
  return `~${(hours / 24).toFixed(1)} days`;
}

type TimelinePoint = { date: string; created: number; validated: number };

export default async function ContactStatsPage() {
  const freeDomainList = Array.from(FREE_EMAIL_DOMAINS);
  const rolePrefixPattern = ROLE_BASED_PREFIXES.join("|");

  const [
    total,
    unsubscribedCount,
    statusGroups,
    countryGroups,
    industryGroups,
    decisionMakerCount,
    roleBasedCount,
    freeEmailCount,
    topDomainsRaw,
    timelineRows,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({ where: { isUnsubscribed: true } }),
    prisma.contact.groupBy({
      by: ["emailStatus"],
      _count: { _all: true },
    }),
    prisma.contact.groupBy({
      by: ["country"],
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
      where: { country: { not: null } },
      take: 10,
    }),
    prisma.contact.groupBy({
      by: ["companyIndustry"],
      _count: { _all: true },
      orderBy: { _count: { companyIndustry: "desc" } },
      where: { companyIndustry: { not: null } },
      take: 10,
    }),
    prisma.contact.count({ where: { decisionMaker: true } }),
    prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c FROM contacts
      WHERE LOWER(email) ~ ('^(' || ${rolePrefixPattern} || ')([.+-][^@]*)?@')
    `,
    prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c FROM contacts
      WHERE LOWER(SPLIT_PART(email, '@', 2)) = ANY(${freeDomainList})
    `,
    prisma.$queryRaw<Array<{ domain: string; c: bigint }>>`
      SELECT LOWER(SPLIT_PART(email, '@', 2)) AS domain, COUNT(*)::bigint AS c
      FROM contacts
      WHERE email LIKE '%@%'
      GROUP BY LOWER(SPLIT_PART(email, '@', 2))
      ORDER BY c DESC
      LIMIT 10
    `,
    prisma.$queryRaw<Array<{ day: Date; created: bigint }>>`
      SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*)::bigint AS created
      FROM contacts
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `,
  ]);


  // Status counts
  const counts: Record<string, number> = {
    valid: 0,
    invalid: 0,
    "catch-all": 0,
    unknown: 0,
    disposable: 0,
    not_verified: 0,
  };
  for (const row of statusGroups) {
    const s = row.emailStatus;
    const n = row._count._all;
    if (s === null || s === "") counts.not_verified += n;
    else if (counts[s] !== undefined) counts[s] += n;
    else counts.unknown += n;
  }

  const verified = total - counts.not_verified;
  const verifiedPercent = total > 0 ? (verified / total) * 100 : 0;

  const roleBased = Number(roleBasedCount[0]?.c ?? 0);
  const freeEmail = Number(freeEmailCount[0]?.c ?? 0);
  const topDomains = topDomainsRaw.map((r) => [r.domain, Number(r.c)] as const);

  // Timeline data
  const timeline: TimelinePoint[] = timelineRows.map((r) => ({
    date: r.day.toISOString().slice(0, 10),
    created: Number(r.created),
    validated: 0, // placeholder — we don't track validation timestamps
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
            <Link href="/contacts" className="hover:text-emerald-600 dark:hover:text-emerald-400">
              Contacts
            </Link>
            <span>/</span>
            <span>Statistics</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Statistics</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Full breakdown of your contacts database
          </p>
        </div>
        <Link
          href="/contacts"
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          ← Back to Contacts
        </Link>
      </div>

      {/* Big Numbers */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total" value={total} accent="gray" />
        <StatCard label="Subscribed" value={total - unsubscribedCount} accent="emerald" />
        <StatCard label="Unsubscribed" value={unsubscribedCount} accent="red" />
        <StatCard label="Verified" value={verified} sub={`${verifiedPercent.toFixed(1)}%`} accent="blue" />
      </div>

      {/* Status Donut + Progress */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Status</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Distribution of email validation results
          </p>
          <div className="mt-6 flex flex-col items-center gap-6 md:flex-row md:items-start">
            <StatusDonut counts={counts} total={total} />
            <div className="flex-1 space-y-2">
              <StatusRow label="Valid" count={counts.valid} total={total} color="emerald" />
              <StatusRow label="Catch-all" count={counts["catch-all"]} total={total} color="amber" />
              <StatusRow label="Unknown" count={counts.unknown} total={total} color="zinc" />
              <StatusRow label="Invalid" count={counts.invalid} total={total} color="red" />
              <StatusRow label="Disposable" count={counts.disposable} total={total} color="orange" />
              <StatusRow label="Not Verified" count={counts.not_verified} total={total} color="gray" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Validation Progress</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Background cron job</p>

          <div className="mt-6 space-y-4">
            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {verifiedPercent.toFixed(1)}
                  <span className="text-base font-medium text-gray-500 dark:text-zinc-400">%</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {verified.toLocaleString()} / {total.toLocaleString()}
                </p>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, verifiedPercent)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 dark:border-zinc-700">
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Remaining</p>
                <p className="mt-0.5 text-lg font-semibold text-gray-900 dark:text-white">
                  {counts.not_verified.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-400">ETA</p>
                <p className="mt-0.5 text-lg font-semibold text-gray-900 dark:text-white">
                  {formatEta(counts.not_verified)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 dark:text-zinc-400">Rate</p>
                <p className="mt-0.5 text-sm text-gray-700 dark:text-zinc-300">
                  5 emails / 2 minutes
                  <span className="text-gray-400 dark:text-zinc-500"> · ~150/hour</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Quality</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          Useful signals for campaign targeting
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <QualityCard
            label="Decision Makers"
            value={decisionMakerCount}
            total={total}
            color="emerald"
            hint="Tagged as decision maker"
          />
          <QualityCard
            label="Role-based"
            value={roleBased}
            total={total}
            color="amber"
            hint="info@, support@, sales@..."
          />
          <QualityCard
            label="Disposable"
            value={counts.disposable}
            total={total}
            color="red"
            hint="Temp/throwaway emails"
          />
          <QualityCard
            label="Free email"
            value={freeEmail}
            total={total}
            color="blue"
            hint="Gmail, Yahoo, Outlook..."
          />
        </div>
      </div>

      {/* Top lists */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <TopList title="Top Countries" rows={countryGroups.map((r) => ({ key: r.country!, count: r._count._all }))} total={total} />
        <TopList title="Top Industries" rows={industryGroups.map((r) => ({ key: r.companyIndustry!, count: r._count._all }))} total={total} />
        <TopList title="Top Email Domains" rows={topDomains.map(([k, c]) => ({ key: k, count: c }))} total={total} />
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contacts Added (Last 30 days)</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          New contacts per day
        </p>
        <div className="mt-6">
          <Timeline points={timeline} />
        </div>
      </div>
    </div>
  );
}

// ============ Subcomponents (server) ============

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent: "gray" | "emerald" | "red" | "blue";
}) {
  const accentClasses = {
    gray: "text-gray-900 dark:text-white",
    emerald: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
  } as const;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
      <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-zinc-400">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className={`text-2xl font-bold ${accentClasses[accent]}`}>{value.toLocaleString()}</p>
        {sub && <p className="text-sm text-gray-500 dark:text-zinc-400">{sub}</p>}
      </div>
    </div>
  );
}

function StatusRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: "emerald" | "amber" | "zinc" | "red" | "orange" | "gray";
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const colorClasses = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    zinc: "bg-zinc-400",
    red: "bg-red-500",
    orange: "bg-orange-500",
    gray: "bg-gray-300 dark:bg-zinc-600",
  } as const;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-zinc-200">{label}</span>
        <span className="text-gray-500 dark:text-zinc-400">
          {count.toLocaleString()}
          <span className="ml-1 text-xs text-gray-400 dark:text-zinc-500">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-700">
        <div className={`h-full rounded-full ${colorClasses[color]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QualityCard({
  label,
  value,
  total,
  color,
  hint,
}: {
  label: string;
  value: number;
  total: number;
  color: "emerald" | "amber" | "red" | "blue";
  hint: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const colorClasses = {
    emerald: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    amber: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
    red: { text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" },
    blue: { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
  } as const;
  const c = colorClasses[color];
  return (
    <div className={`rounded-xl p-4 ${c.bg}`}>
      <p className={`text-2xl font-bold ${c.text}`}>{value.toLocaleString()}</p>
      <p className="mt-1 text-sm font-medium text-gray-700 dark:text-zinc-200">{label}</p>
      <p className="text-xs text-gray-500 dark:text-zinc-400">
        {pct.toFixed(1)}% · {hint}
      </p>
    </div>
  );
}

function TopList({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { key: string; count: number }[];
  total: number;
}) {
  const max = rows[0]?.count ?? 1;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-zinc-400">No data</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => {
            const pct = total > 0 ? (row.count / total) * 100 : 0;
            const widthPct = (row.count / max) * 100;
            return (
              <li key={row.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="truncate font-medium text-gray-700 dark:text-zinc-200" title={row.key}>
                    {row.key}
                  </span>
                  <span className="ml-2 shrink-0 text-gray-500 dark:text-zinc-400">
                    {row.count.toLocaleString()}
                    <span className="ml-1 text-xs text-gray-400 dark:text-zinc-500">({pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-700">
                  <div
                    className="h-full rounded-full bg-emerald-500/70"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
