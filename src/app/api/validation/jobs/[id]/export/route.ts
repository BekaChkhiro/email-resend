import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF10B981" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const job = await prisma.validationJob.findUnique({
    where: { id },
    select: { name: true, emailColumn: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const rows = await prisma.validationEmail.findMany({
    where: { jobId: id, status: "valid" },
    select: { email: true, score: true, rawRow: true },
    orderBy: { email: "asc" },
  });

  // Build a stable column set: email + score first, then every other key
  // seen across the original CSV rows (in first-seen order).
  const extraColumns: string[] = [];
  const seenCols = new Set<string>([job.emailColumn]);
  for (const r of rows) {
    const raw = (r.rawRow ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(raw)) {
      if (!seenCols.has(key)) {
        seenCols.add(key);
        extraColumns.push(key);
      }
    }
  }

  const headers = ["email", "score", ...extraColumns];

  const rowValues = (r: (typeof rows)[number]): string[] => {
    const raw = (r.rawRow ?? {}) as Record<string, unknown>;
    return [
      r.email,
      r.score != null ? String(r.score) : "",
      ...extraColumns.map((c) => {
        const v = raw[c];
        return v == null ? "" : String(v);
      }),
    ];
  };

  const safeName = job.name.replace(/[^\w.-]+/g, "_").slice(0, 60) || "validation";
  const filenameBase = `${safeName}-valid-${rows.length}`;

  if (format === "csv") {
    const lines = [headers.map(csvEscape).join(",")];
    for (const r of rows) {
      lines.push(rowValues(r).map(csvEscape).join(","));
    }
    // BOM so Excel opens UTF-8 correctly.
    const body = "﻿" + lines.join("\r\n");
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // xlsx
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Email Resend";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(`Valid Emails (${rows.length})`, {
    properties: { tabColor: { argb: "FF059669" } },
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = headers.map((h) => ({
    header: h,
    key: h,
    width: h === "email" ? 38 : h === "score" ? 10 : 22,
  }));
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
  headerRow.height = 22;

  for (const r of rows) {
    sheet.addRow(rowValues(r));
  }
  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
