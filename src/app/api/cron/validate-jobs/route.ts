import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runJobBatch } from "@/lib/validation-job-worker";
import { requireCronAuth } from "@/lib/cron-auth";

const BATCH_SIZE = 5;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: NextRequest) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  const startedAt = Date.now();

  const remainingBefore = await prisma.validationEmail.count({
    where: { status: null },
  });

  const { processed, succeeded, failed } = await runJobBatch(BATCH_SIZE);

  const remainingAfter = await prisma.validationEmail.count({
    where: { status: null },
  });

  return NextResponse.json({
    success: true,
    processed,
    succeeded,
    failed,
    remainingBefore,
    remainingAfter,
    durationMs: Date.now() - startedAt,
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
