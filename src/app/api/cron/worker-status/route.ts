import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkerState } from "@/lib/validation-worker";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getWorkerState();
  const remaining = await prisma.contact.count({
    where: { OR: [{ emailStatus: null }, { emailStatus: "" }] },
  });

  return NextResponse.json({
    workerRunning: state.running,
    workerStartedAt: state.startedAt,
    lastTickAt: state.lastTickAt,
    lastTickResult: state.lastTickResult,
    totals: {
      processed: state.totalProcessed,
      succeeded: state.totalSucceeded,
      failed: state.totalFailed,
    },
    errors: state.errors,
    lastError: state.lastError,
    remainingUnverified: remaining,
    serverTime: new Date(),
  });
}
