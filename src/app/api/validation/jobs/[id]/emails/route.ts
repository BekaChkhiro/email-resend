import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Basic shape check — the real validation happens against the external API.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Append a chunk of emails to an existing job. The client de-dupes and
 * normalizes across the whole file before chunking; this route re-validates
 * the address shape (never trust the client) and inserts the survivors,
 * bumping the job's totalEmails by the number actually added.
 *
 * Body: { rows: { email: string; rawRow: Record<string, string> }[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const job = await prisma.validationJob.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const rows = body?.rows as
    | { email?: string; rawRow?: Record<string, string> }[]
    | undefined;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided." }, { status: 400 });
  }

  let skipped = 0;
  const data: Prisma.ValidationEmailCreateManyInput[] = [];
  for (const row of rows) {
    const email = (row.email ?? "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      skipped++;
      continue;
    }
    data.push({
      jobId: id,
      email,
      rawRow: (row.rawRow ?? {}) as Prisma.InputJsonValue,
    });
  }

  let added = 0;
  if (data.length > 0) {
    const result = await prisma.validationEmail.createMany({ data });
    added = result.count;
    await prisma.validationJob.update({
      where: { id },
      data: { totalEmails: { increment: added } },
    });
  }

  return NextResponse.json({ added, skipped });
}
