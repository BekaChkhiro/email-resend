import { prisma } from "@/lib/db";
import { isJobPaused } from "@/lib/validation-job-worker";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Job detail + per-status breakdown (for the progress UI). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const job = await prisma.validationJob.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      emailColumn: true,
      totalEmails: true,
      processedEmails: true,
      validEmails: true,
      createdAt: true,
      completedAt: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const grouped = await prisma.validationEmail.groupBy({
    by: ["status"],
    where: { jobId: id },
    _count: { _all: true },
  });

  const breakdown: Record<string, number> = {
    valid: 0,
    invalid: 0,
    "catch-all": 0,
    unknown: 0,
    disposable: 0,
    pending: 0,
  };
  for (const g of grouped) {
    const key = g.status ?? "pending";
    breakdown[key] = (breakdown[key] ?? 0) + g._count._all;
  }

  return NextResponse.json({ job, breakdown, paused: isJobPaused(id) });
}

/** Delete a job and all its email rows (cascade). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.validationJob.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
}
