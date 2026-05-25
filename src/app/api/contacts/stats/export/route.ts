import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ROLE_BASED_PREFIXES = [
  "info", "admin", "support", "sales", "contact", "hello", "help", "office",
  "marketing", "press", "billing", "noreply", "no-reply", "donotreply",
  "team", "service", "feedback", "abuse", "postmaster", "webmaster",
];

const FREE_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
  "aol.com", "live.com", "mail.ru", "yandex.com", "yandex.ru",
  "protonmail.com", "proton.me", "gmx.com", "gmx.net", "zoho.com",
  "msn.com", "yahoo.co.uk", "me.com", "mac.com",
];

const RATE_PER_HOUR = 150;

function formatEta(remaining: number): string {
  if (remaining <= 0) return "Complete";
  const hours = remaining / RATE_PER_HOUR;
  if (hours < 1) return `~${Math.ceil(hours * 60)} min`;
  if (hours < 24) return `~${Math.ceil(hours)} h`;
  return `~${(hours / 24).toFixed(1)} days`;
}

function escapeHtml(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const rolePrefixPattern = ROLE_BASED_PREFIXES.join("|");

  const [
    total,
    unsubscribedCount,
    statusGroups,
    countryGroups,
    industryGroups,
    decisionMakerCount,
    roleBasedRaw,
    freeEmailRaw,
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
      take: 20,
    }),
    prisma.contact.groupBy({
      by: ["companyIndustry"],
      _count: { _all: true },
      orderBy: { _count: { companyIndustry: "desc" } },
      where: { companyIndustry: { not: null } },
      take: 20,
    }),
    prisma.contact.count({ where: { decisionMaker: true } }),
    prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c FROM contacts
      WHERE LOWER(email) ~ ('^(' || ${rolePrefixPattern} || ')([.+-][^@]*)?@')
    `,
    prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c FROM contacts
      WHERE LOWER(SPLIT_PART(email, '@', 2)) = ANY(${FREE_EMAIL_DOMAINS})
    `,
    prisma.$queryRaw<Array<{ domain: string; c: bigint }>>`
      SELECT LOWER(SPLIT_PART(email, '@', 2)) AS domain, COUNT(*)::bigint AS c
      FROM contacts
      WHERE email LIKE '%@%'
      GROUP BY LOWER(SPLIT_PART(email, '@', 2))
      ORDER BY c DESC
      LIMIT 20
    `,
    prisma.$queryRaw<Array<{ day: Date; created: bigint }>>`
      SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*)::bigint AS created
      FROM contacts
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `,
  ]);

  const counts: Record<string, number> = {
    valid: 0, invalid: 0, "catch-all": 0, unknown: 0, disposable: 0, not_verified: 0,
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
  const subscribed = total - unsubscribedCount;
  const roleBased = Number(roleBasedRaw[0]?.c ?? 0);
  const freeEmail = Number(freeEmailRaw[0]?.c ?? 0);

  const today = new Date().toISOString().slice(0, 10);

  const pct = (n: number) =>
    total > 0 ? `${((n / total) * 100).toFixed(2)}%` : "0%";

  const section = (title: string, rows: Array<[string, string | number, string?]>) => {
    return `
      <tr><td colspan="3" class="section">${escapeHtml(title)}</td></tr>
      <tr><th>Metric</th><th>Value</th><th>%</th></tr>
      ${rows
        .map(
          ([label, value, percent]) =>
            `<tr><td>${escapeHtml(label)}</td><td class="num">${escapeHtml(value)}</td><td class="num">${escapeHtml(percent ?? "")}</td></tr>`
        )
        .join("")}
      <tr class="spacer"><td colspan="3">&nbsp;</td></tr>
    `;
  };

  const listSection = (title: string, rows: Array<{ key: string; count: number }>) => {
    return `
      <tr><td colspan="3" class="section">${escapeHtml(title)}</td></tr>
      <tr><th>Rank</th><th>${escapeHtml(title)}</th><th>Count</th></tr>
      ${rows
        .map(
          (r, i) =>
            `<tr><td class="num">${i + 1}</td><td>${escapeHtml(r.key)}</td><td class="num">${r.count.toLocaleString()}</td></tr>`
        )
        .join("")}
      <tr class="spacer"><td colspan="3">&nbsp;</td></tr>
    `;
  };

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <title>Contact Statistics — ${today}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #d1d5db; padding: 6px 10px; vertical-align: middle; }
    th { background: #10b981; color: #ffffff; font-weight: bold; text-align: left; }
    td.num { text-align: right; }
    tr.spacer td { border: none; height: 8px; background: #ffffff; }
    .section { background: #1f2937; color: #ffffff; font-weight: bold; font-size: 13pt; padding: 10px; }
    .title { background: #ffffff; color: #1f2937; font-weight: bold; font-size: 18pt; padding: 14px; border: none; }
    .meta { color: #6b7280; font-style: italic; padding: 4px 10px; border: none; }
  </style>
</head>
<body>
<table>
  <tr><td colspan="3" class="title">Contact Statistics</td></tr>
  <tr><td colspan="3" class="meta">Generated: ${today} · Auto-generated from /contacts/stats</td></tr>
  <tr class="spacer"><td colspan="3">&nbsp;</td></tr>

  ${section("OVERVIEW", [
    ["Total contacts", total.toLocaleString(), "100%"],
    ["Subscribed", subscribed.toLocaleString(), pct(subscribed)],
    ["Unsubscribed", unsubscribedCount.toLocaleString(), pct(unsubscribedCount)],
    ["Verified", verified.toLocaleString(), `${verifiedPercent.toFixed(2)}%`],
    ["Not Verified (remaining)", counts.not_verified.toLocaleString(), pct(counts.not_verified)],
    ["Validation rate", "5 emails / 2 min · ~150/hour", ""],
    ["ETA", formatEta(counts.not_verified), ""],
  ])}

  ${section("EMAIL STATUS BREAKDOWN", [
    ["Valid", counts.valid.toLocaleString(), pct(counts.valid)],
    ["Catch-all", counts["catch-all"].toLocaleString(), pct(counts["catch-all"])],
    ["Unknown", counts.unknown.toLocaleString(), pct(counts.unknown)],
    ["Invalid", counts.invalid.toLocaleString(), pct(counts.invalid)],
    ["Disposable", counts.disposable.toLocaleString(), pct(counts.disposable)],
    ["Not Verified", counts.not_verified.toLocaleString(), pct(counts.not_verified)],
  ])}

  ${section("EMAIL QUALITY", [
    ["Decision Makers", decisionMakerCount.toLocaleString(), pct(decisionMakerCount)],
    ["Role-based (info@, support@, ...)", roleBased.toLocaleString(), pct(roleBased)],
    ["Disposable / throwaway", counts.disposable.toLocaleString(), pct(counts.disposable)],
    ["Free email (Gmail, Yahoo, ...)", freeEmail.toLocaleString(), pct(freeEmail)],
  ])}

  ${listSection(
    "TOP 20 COUNTRIES",
    countryGroups.map((r) => ({ key: r.country!, count: r._count._all }))
  )}

  ${listSection(
    "TOP 20 INDUSTRIES",
    industryGroups.map((r) => ({ key: r.companyIndustry!, count: r._count._all }))
  )}

  ${listSection(
    "TOP 20 EMAIL DOMAINS",
    topDomainsRaw.map((r) => ({ key: r.domain, count: Number(r.c) }))
  )}

  <tr><td colspan="3" class="section">CONTACTS ADDED — LAST 30 DAYS</td></tr>
  <tr><th>Date</th><th>New Contacts</th><th>Cumulative</th></tr>
  ${(() => {
    let cum = 0;
    return timelineRows
      .map((r) => {
        const c = Number(r.created);
        cum += c;
        return `<tr><td>${r.day.toISOString().slice(0, 10)}</td><td class="num">${c.toLocaleString()}</td><td class="num">${cum.toLocaleString()}</td></tr>`;
      })
      .join("");
  })()}

</table>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=UTF-8",
      "Content-Disposition": `attachment; filename="contacts-stats-${today}.xls"`,
      "Cache-Control": "no-store",
    },
  });
}
