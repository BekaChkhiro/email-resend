import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getDailyLimit,
  isWarmupComplete,
  getWarmupProgress,
  WARMUP_DURATION_DAYS,
} from "@/lib/warmup-schedule";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const domains = await prisma.domain.findMany({
    select: {
      id: true,
      domain: true,
      fromEmail: true,
      isActive: true,
      warmupEnabled: true,
      warmupStartedAt: true,
      warmupCompletedAt: true,
      warmupDay: true,
      warmupSentToday: true,
      warmupLastSentAt: true,
    },
    orderBy: { domain: "asc" },
  });

  const warmupEmailCounts = await prisma.warmupEmail.groupBy({
    by: ["senderDomainId", "status"],
    _count: { _all: true },
  });

  const countsByDomain = new Map<string, Record<string, number>>();
  for (const row of warmupEmailCounts) {
    const map = countsByDomain.get(row.senderDomainId) ?? {};
    map[row.status] = row._count._all;
    countsByDomain.set(row.senderDomainId, map);
  }

  const result = domains.map((d) => {
    const dailyLimit = getDailyLimit(d.warmupDay);
    const progress = getWarmupProgress(d.warmupDay);
    const complete = isWarmupComplete(d.warmupDay);
    const stats = countsByDomain.get(d.id) ?? {};
    return {
      domain: d.domain,
      fromEmail: d.fromEmail,
      isActive: d.isActive,
      warmupEnabled: d.warmupEnabled,
      warmupCompleted: !!d.warmupCompletedAt,
      day: `${d.warmupDay}/${WARMUP_DURATION_DAYS}`,
      dailyLimit,
      sentToday: d.warmupSentToday,
      progress: `${progress}%`,
      complete,
      startedAt: d.warmupStartedAt,
      lastSentAt: d.warmupLastSentAt,
      lifetime: {
        pending: stats.pending ?? 0,
        sent: stats.sent ?? 0,
        delivered: stats.delivered ?? 0,
        replied: stats.replied ?? 0,
        failed: stats.failed ?? 0,
      },
    };
  });

  return NextResponse.json({
    totalDomains: domains.length,
    activeWarmups: domains.filter((d) => d.warmupEnabled).length,
    completedWarmups: domains.filter((d) => d.warmupCompletedAt).length,
    serverTime: new Date(),
    domains: result,
  });
}
