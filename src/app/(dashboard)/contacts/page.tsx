import Link from "next/link";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import ContactsTable from "./contacts-table";

const PAGE_SIZE = 50;

const STATUS_VALUES = ["valid", "invalid", "catch-all", "unknown", "disposable"] as const;
type StatusValue = (typeof STATUS_VALUES)[number];

function safeInt(value: string | undefined, fallback: number, min: number): number {
  const n = parseInt(value || "", 10);
  if (Number.isNaN(n) || n < min) return fallback;
  return n;
}

export function buildContactsWhere(params: {
  q?: string;
  status?: string;
}): Prisma.ContactWhereInput {
  const conditions: Prisma.ContactWhereInput[] = [];

  if (params.q) {
    const q = params.q;
    conditions.push({
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { country: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const s = params.status;
  if (s && s !== "all") {
    if (s === "not_verified") {
      conditions.push({ OR: [{ emailStatus: null }, { emailStatus: "" }] });
    } else if (s === "invalid_all") {
      conditions.push({
        AND: [
          { emailStatus: { not: null } },
          { emailStatus: { not: "" } },
          { emailStatus: { not: "valid" } },
        ],
      });
    } else if ((STATUS_VALUES as readonly string[]).includes(s)) {
      conditions.push({ emailStatus: s as StatusValue });
    }
  }

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];
  return { AND: conditions };
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const status = params.status || "all";

  const where = buildContactsWhere({ q, status });

  // Get total of filtered set first so we can clamp page
  const filteredTotal = await prisma.contact.count({ where });
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const requestedPage = safeInt(params.page, 1, 1);
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * PAGE_SIZE;

  // Run header stats + status counts + paged rows in parallel
  const [contacts, total, unsubscribedCount, statusAgg] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        campaignEmails: {
          select: {
            campaignId: true,
            campaign: { select: { id: true, name: true, status: true } },
          },
          distinct: ["campaignId"],
        },
      },
    }),
    prisma.contact.count(),
    prisma.contact.count({ where: { isUnsubscribed: true } }),
    prisma.contact.groupBy({
      by: ["emailStatus"],
      _count: { _all: true },
    }),
  ]);

  // Build status counts from groupBy
  const counts = {
    all: total,
    valid: 0,
    invalid: 0,
    "catch-all": 0,
    unknown: 0,
    disposable: 0,
    not_verified: 0,
    invalid_all: 0,
  };
  for (const row of statusAgg) {
    const s = row.emailStatus;
    const n = row._count._all;
    if (s === null || s === "") {
      counts.not_verified += n;
    } else if (s === "valid") {
      counts.valid += n;
    } else if (s === "invalid") {
      counts.invalid += n;
      counts.invalid_all += n;
    } else if (s === "catch-all") {
      counts["catch-all"] += n;
      counts.invalid_all += n;
    } else if (s === "unknown") {
      counts.unknown += n;
      counts.invalid_all += n;
    } else if (s === "disposable") {
      counts.disposable += n;
      counts.invalid_all += n;
    } else {
      counts.invalid_all += n;
    }
  }

  const subscribedCount = total - unsubscribedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Manage your email contacts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/contacts/stats"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Statistics
          </Link>
          <div className="flex items-center gap-6 rounded-lg bg-white px-5 py-2.5 shadow-sm ring-1 ring-gray-200 dark:bg-zinc-800 dark:ring-zinc-700">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {total.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Total</p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-zinc-700" />
            <div className="text-center">
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {subscribedCount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Subscribed</p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-zinc-700" />
            <div className="text-center">
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                {unsubscribedCount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Unsubscribed</p>
            </div>
          </div>
        </div>
      </div>

      <ContactsTable
        contacts={contacts}
        filteredTotal={filteredTotal}
        page={page}
        limit={PAGE_SIZE}
        searchQuery={q}
        statusFilter={status}
        statusCounts={counts}
      />
    </div>
  );
}
