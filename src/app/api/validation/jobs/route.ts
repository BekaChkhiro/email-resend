import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Create an empty validation job. Emails are appended afterwards via
 * POST /api/validation/jobs/[id]/emails so very large CSVs can be streamed
 * in chunks (staying under the serverless request-body limit).
 *
 * Body: { name, emailColumn }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { name, emailColumn } = body as { name?: string; emailColumn?: string };

  if (!emailColumn) {
    return NextResponse.json({ error: "emailColumn is required." }, { status: 400 });
  }

  const job = await prisma.validationJob.create({
    data: {
      name: (name || "Untitled import").slice(0, 200),
      emailColumn,
      status: "pending",
      totalEmails: 0,
    },
  });

  return NextResponse.json({ job: { id: job.id, name: job.name } });
}

/** List all validation jobs, newest first. */
export async function GET() {
  const jobs = await prisma.validationJob.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      totalEmails: true,
      processedEmails: true,
      validEmails: true,
      createdAt: true,
      completedAt: true,
    },
  });
  return NextResponse.json({ jobs });
}
