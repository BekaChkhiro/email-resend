"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  getDailyLimit,
  getWarmupProgress,
  WARMUP_DURATION_DAYS,
} from "@/lib/warmup-schedule";

export interface WarmupDomainStats {
  id: string;
  domain: string;
  fromEmail: string;
  warmupEnabled: boolean;
  warmupStartedAt: Date | null;
  warmupCompletedAt: Date | null;
  warmupDay: number;
  warmupSentToday: number;
  dailyLimit: number;
  progress: number;
  totalSent: number;
  isComplete: boolean;
}

export async function getWarmupStats(): Promise<WarmupDomainStats[]> {
  const domains = await prisma.domain.findMany({
    where: { isActive: true },
    orderBy: { domain: "asc" },
    include: {
      _count: {
        select: {
          warmupEmailsSent: {
            where: { status: { in: ["sent", "delivered", "replied"] } },
          },
        },
      },
    },
  });

  return domains.map((domain) => ({
    id: domain.id,
    domain: domain.domain,
    fromEmail: domain.fromEmail,
    warmupEnabled: domain.warmupEnabled,
    warmupStartedAt: domain.warmupStartedAt,
    warmupCompletedAt: domain.warmupCompletedAt,
    warmupDay: domain.warmupDay,
    warmupSentToday: domain.warmupSentToday,
    dailyLimit: getDailyLimit(domain.warmupDay),
    progress: getWarmupProgress(domain.warmupDay),
    totalSent: domain._count.warmupEmailsSent,
    isComplete: domain.warmupDay > WARMUP_DURATION_DAYS,
  }));
}

export async function toggleWarmup(domainId: string) {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) {
    return { error: "Domain not found." };
  }

  const now = new Date();
  const newEnabled = !domain.warmupEnabled;

  await prisma.domain.update({
    where: { id: domainId },
    data: {
      warmupEnabled: newEnabled,
      warmupStartedAt: newEnabled && !domain.warmupStartedAt ? now : domain.warmupStartedAt,
      warmupDay: newEnabled && domain.warmupDay === 0 ? 1 : domain.warmupDay,
    },
  });

  revalidatePath("/domains/warmup");
  return { success: true, enabled: newEnabled };
}

export async function resetWarmup(domainId: string) {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) {
    return { error: "Domain not found." };
  }

  // Delete all warmup emails for this domain
  await prisma.warmupEmail.deleteMany({
    where: {
      OR: [{ senderDomainId: domainId }, { receiverDomainId: domainId }],
    },
  });

  // Reset domain warmup state
  await prisma.domain.update({
    where: { id: domainId },
    data: {
      warmupEnabled: false,
      warmupStartedAt: null,
      warmupCompletedAt: null,
      warmupDay: 0,
      warmupSentToday: 0,
      warmupLastSentAt: null,
    },
  });

  revalidatePath("/domains/warmup");
  return { success: true };
}

export interface WarmupEmailRecord {
  id: string;
  senderDomain: string;
  senderEmail: string;
  receiverDomain: string;
  receiverEmail: string;
  subject: string;
  body: string;
  conversationType: string;
  isInitialEmail: boolean;
  replyDepth: number;
  status: string;
  sentAt: Date | null;
  warmupDay: number;
  createdAt: Date;
}

export async function getWarmupEmails(
  domainId: string,
  limit = 50
): Promise<WarmupEmailRecord[]> {
  const emails = await prisma.warmupEmail.findMany({
    where: {
      OR: [{ senderDomainId: domainId }, { receiverDomainId: domainId }],
    },
    include: {
      senderDomain: { select: { domain: true, fromEmail: true } },
      receiverDomain: { select: { domain: true, fromEmail: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return emails.map((email) => ({
    id: email.id,
    senderDomain: email.senderDomain.domain,
    senderEmail: email.senderDomain.fromEmail,
    receiverDomain: email.receiverDomain.domain,
    receiverEmail: email.receiverDomain.fromEmail,
    subject: email.subject,
    body: email.body,
    conversationType: email.conversationType,
    isInitialEmail: email.isInitialEmail,
    replyDepth: email.replyDepth,
    status: email.status,
    sentAt: email.sentAt,
    warmupDay: email.warmupDay,
    createdAt: email.createdAt,
  }));
}

export async function getWarmupOverview() {
  const [activeCount, completedCount, sentToday, totalSent] = await Promise.all([
    prisma.domain.count({ where: { warmupEnabled: true, isActive: true } }),
    prisma.domain.count({
      where: {
        warmupCompletedAt: { not: null },
        isActive: true,
      },
    }),
    prisma.warmupEmail.count({
      where: {
        status: { in: ["sent", "delivered", "replied"] },
        sentAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.warmupEmail.count({
      where: { status: { in: ["sent", "delivered", "replied"] } },
    }),
  ]);

  return { activeCount, completedCount, sentToday, totalSent };
}
