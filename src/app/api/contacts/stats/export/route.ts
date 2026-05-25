import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF10B981" },
};

const SECTION_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F2937" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};

const SECTION_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 13,
};

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFD1D5DB" } },
      left: { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      right: { style: "thin", color: { argb: "FFD1D5DB" } },
    };
  });
  row.height = 22;
}

function addSectionTitle(sheet: ExcelJS.Worksheet, title: string, span = 4) {
  const row = sheet.addRow([title]);
  sheet.mergeCells(row.number, 1, row.number, span);
  const cell = row.getCell(1);
  cell.fill = SECTION_FILL;
  cell.font = SECTION_FONT;
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  row.height = 26;
}

function styleDataRows(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  numericCols: number[] = [],
  percentCols: number[] = []
) {
  for (let r = startRow; r <= endRow; r++) {
    const row = sheet.getRow(r);
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
      cell.alignment = { vertical: "middle" };
      if (numericCols.includes(colNumber)) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.numFmt = "#,##0";
      }
      if (percentCols.includes(colNumber)) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.numFmt = "0.00%";
      }
    });
  }
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
      take: 50,
    }),
    prisma.contact.groupBy({
      by: ["companyIndustry"],
      _count: { _all: true },
      orderBy: { _count: { companyIndustry: "desc" } },
      where: { companyIndustry: { not: null } },
      take: 50,
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
      LIMIT 50
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
  const subscribed = total - unsubscribedCount;
  const roleBased = Number(roleBasedRaw[0]?.c ?? 0);
  const freeEmail = Number(freeEmailRaw[0]?.c ?? 0);
  const today = new Date().toISOString().slice(0, 10);

  const pct = (n: number) => (total > 0 ? n / total : 0);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Email Resend";
  workbook.created = new Date();

  // ============ Sheet 1: Overview ============
  const overview = workbook.addWorksheet("Overview", {
    properties: { tabColor: { argb: "FF10B981" } },
    views: [{ state: "frozen", ySplit: 1 }],
  });
  overview.columns = [
    { header: "Metric", key: "metric", width: 38 },
    { header: "Value", key: "value", width: 18 },
    { header: "% of Total", key: "percent", width: 14 },
  ];
  styleHeader(overview.getRow(1));

  addSectionTitle(overview, "Overall", 3);
  let r = overview.lastRow!.number;
  const overviewRows = [
    ["Total contacts", total, 1],
    ["Subscribed", subscribed, pct(subscribed)],
    ["Unsubscribed", unsubscribedCount, pct(unsubscribedCount)],
    ["Verified", verified, pct(verified)],
    ["Not Verified (remaining)", counts.not_verified, pct(counts.not_verified)],
  ];
  for (const [m, v, p] of overviewRows) overview.addRow([m, v, p]);
  styleDataRows(overview, r + 1, overview.lastRow!.number, [2], [3]);

  overview.addRow([]);
  addSectionTitle(overview, "Validation Progress", 3);
  r = overview.lastRow!.number;
  overview.addRow(["Validation rate", "5 emails / 2 min (~150/hour)", ""]);
  overview.addRow(["ETA to complete", formatEta(counts.not_verified), ""]);
  overview.addRow(["Generated on", today, ""]);
  styleDataRows(overview, r + 1, overview.lastRow!.number);

  // ============ Sheet 2: Status Breakdown ============
  const statusSheet = workbook.addWorksheet("Status Breakdown", {
    properties: { tabColor: { argb: "FF3B82F6" } },
    views: [{ state: "frozen", ySplit: 1 }],
  });
  statusSheet.columns = [
    { header: "Email Status", key: "status", width: 22 },
    { header: "Count", key: "count", width: 14 },
    { header: "% of Total", key: "percent", width: 14 },
  ];
  styleHeader(statusSheet.getRow(1));
  const statusRows: [string, number][] = [
    ["Valid", counts.valid],
    ["Catch-all", counts["catch-all"]],
    ["Unknown", counts.unknown],
    ["Invalid", counts.invalid],
    ["Disposable", counts.disposable],
    ["Not Verified", counts.not_verified],
  ];
  for (const [label, c] of statusRows) statusSheet.addRow([label, c, pct(c)]);
  styleDataRows(statusSheet, 2, statusSheet.lastRow!.number, [2], [3]);

  // ============ Sheet 3: Quality ============
  const qualitySheet = workbook.addWorksheet("Email Quality", {
    properties: { tabColor: { argb: "FF8B5CF6" } },
    views: [{ state: "frozen", ySplit: 1 }],
  });
  qualitySheet.columns = [
    { header: "Quality Signal", key: "signal", width: 36 },
    { header: "Count", key: "count", width: 14 },
    { header: "% of Total", key: "percent", width: 14 },
  ];
  styleHeader(qualitySheet.getRow(1));
  const qualityRows: [string, number][] = [
    ["Decision Makers", decisionMakerCount],
    ["Role-based (info@, support@, ...)", roleBased],
    ["Disposable / throwaway", counts.disposable],
    ["Free email (Gmail, Yahoo, ...)", freeEmail],
  ];
  for (const [label, c] of qualityRows) qualitySheet.addRow([label, c, pct(c)]);
  styleDataRows(qualitySheet, 2, qualitySheet.lastRow!.number, [2], [3]);

  // ============ Sheet 4: Top Countries ============
  const countrySheet = workbook.addWorksheet("Top Countries", {
    properties: { tabColor: { argb: "FFF59E0B" } },
    views: [{ state: "frozen", ySplit: 1 }],
  });
  countrySheet.columns = [
    { header: "Rank", key: "rank", width: 8 },
    { header: "Country", key: "country", width: 36 },
    { header: "Count", key: "count", width: 14 },
    { header: "% of Total", key: "percent", width: 14 },
  ];
  styleHeader(countrySheet.getRow(1));
  countryGroups.forEach((g, i) => {
    countrySheet.addRow([i + 1, g.country, g._count._all, pct(g._count._all)]);
  });
  styleDataRows(countrySheet, 2, countrySheet.lastRow!.number, [1, 3], [4]);

  // ============ Sheet 5: Top Industries ============
  const industrySheet = workbook.addWorksheet("Top Industries", {
    properties: { tabColor: { argb: "FFEC4899" } },
    views: [{ state: "frozen", ySplit: 1 }],
  });
  industrySheet.columns = [
    { header: "Rank", key: "rank", width: 8 },
    { header: "Industry", key: "industry", width: 50 },
    { header: "Count", key: "count", width: 14 },
    { header: "% of Total", key: "percent", width: 14 },
  ];
  styleHeader(industrySheet.getRow(1));
  industryGroups.forEach((g, i) => {
    industrySheet.addRow([i + 1, g.companyIndustry, g._count._all, pct(g._count._all)]);
  });
  styleDataRows(industrySheet, 2, industrySheet.lastRow!.number, [1, 3], [4]);

  // ============ Sheet 6: Top Domains ============
  const domainSheet = workbook.addWorksheet("Top Email Domains", {
    properties: { tabColor: { argb: "FF06B6D4" } },
    views: [{ state: "frozen", ySplit: 1 }],
  });
  domainSheet.columns = [
    { header: "Rank", key: "rank", width: 8 },
    { header: "Domain", key: "domain", width: 32 },
    { header: "Count", key: "count", width: 14 },
    { header: "% of Total", key: "percent", width: 14 },
  ];
  styleHeader(domainSheet.getRow(1));
  topDomainsRaw.forEach((d, i) => {
    const c = Number(d.c);
    domainSheet.addRow([i + 1, d.domain, c, pct(c)]);
  });
  styleDataRows(domainSheet, 2, domainSheet.lastRow!.number, [1, 3], [4]);

  // ============ Sheet 7: Timeline ============
  const timelineSheet = workbook.addWorksheet("Timeline (30 days)", {
    properties: { tabColor: { argb: "FFEF4444" } },
    views: [{ state: "frozen", ySplit: 1 }],
  });
  timelineSheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "New Contacts", key: "added", width: 16 },
    { header: "Cumulative", key: "cumulative", width: 16 },
  ];
  styleHeader(timelineSheet.getRow(1));
  let cumulative = 0;
  for (const row of timelineRows) {
    cumulative += Number(row.created);
    timelineSheet.addRow([
      row.day.toISOString().slice(0, 10),
      Number(row.created),
      cumulative,
    ]);
  }
  styleDataRows(timelineSheet, 2, timelineSheet.lastRow!.number, [2, 3]);

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="contacts-stats-${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
