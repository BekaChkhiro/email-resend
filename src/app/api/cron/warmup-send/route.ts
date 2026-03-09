import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resend } from "@/lib/resend";
import { getDailyLimit, isWarmupComplete, WARMUP_DURATION_DAYS } from "@/lib/warmup-schedule";
import {
  generateWarmupEmail,
  getRandomConversationType,
  generateThreadId,
} from "@/lib/warmup-content";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[WARMUP-SEND] Starting warmup send job...");

  const now = new Date();

  // Find all domains with warmup enabled
  const warmupDomains = await prisma.domain.findMany({
    where: {
      warmupEnabled: true,
      isActive: true,
    },
    orderBy: { warmupSentToday: "asc" }, // Prioritize domains that sent less today
  });

  if (warmupDomains.length === 0) {
    console.log("[WARMUP-SEND] No domains with warmup enabled");
    return NextResponse.json({ message: "No warmup domains" });
  }

  console.log(`[WARMUP-SEND] Found ${warmupDomains.length} warmup domains`);

  let totalSent = 0;
  let totalFailed = 0;

  for (const domain of warmupDomains) {
    // Check if warmup is complete
    if (isWarmupComplete(domain.warmupDay)) {
      console.log(`[WARMUP-SEND] Domain ${domain.domain}: warmup complete, disabling`);
      await prisma.domain.update({
        where: { id: domain.id },
        data: {
          warmupEnabled: false,
          warmupCompletedAt: now,
        },
      });
      continue;
    }

    // Reset daily counters if it's a new day
    let currentWarmupDay = domain.warmupDay;
    let sentToday = domain.warmupSentToday;

    if (domain.warmupLastSentAt && !isSameDay(domain.warmupLastSentAt, now)) {
      // New day - increment warmup day and reset counter
      currentWarmupDay = Math.min(domain.warmupDay + 1, WARMUP_DURATION_DAYS);
      sentToday = 0;

      await prisma.domain.update({
        where: { id: domain.id },
        data: {
          warmupDay: currentWarmupDay,
          warmupSentToday: 0,
        },
      });

      console.log(`[WARMUP-SEND] Domain ${domain.domain}: advanced to day ${currentWarmupDay}`);
    }

    // Check daily limit
    const dailyLimit = getDailyLimit(currentWarmupDay);
    if (sentToday >= dailyLimit) {
      console.log(
        `[WARMUP-SEND] Domain ${domain.domain}: daily limit reached (${sentToday}/${dailyLimit})`
      );
      continue;
    }

    // Select a receiver domain (round-robin, different from sender)
    const receiverDomain = await prisma.domain.findFirst({
      where: {
        id: { not: domain.id },
        isActive: true,
        warmupEnabled: true,
      },
      orderBy: [
        { warmupSentToday: "asc" },
        { warmupLastSentAt: "asc" },
      ],
    });

    if (!receiverDomain) {
      console.log(`[WARMUP-SEND] Domain ${domain.domain}: no receiver domain available`);
      continue;
    }

    // Generate warmup email content
    const conversationType = getRandomConversationType();
    const threadId = generateThreadId();

    try {
      const content = await generateWarmupEmail({
        senderName: domain.fromName,
        receiverName: receiverDomain.fromName,
        conversationType,
        isReply: false,
      });

      console.log(
        `[WARMUP-SEND] ${domain.fromEmail} -> ${receiverDomain.fromEmail}: "${content.subject}"`
      );

      // Send via Resend
      const result = await resend.emails.send({
        from: `${domain.fromName} <${domain.fromEmail}>`,
        to: [receiverDomain.fromEmail],
        subject: content.subject,
        text: content.body,
        headers: {
          "X-Warmup-Thread": threadId,
        },
      });

      if (result.error) {
        console.log(`[WARMUP-SEND] FAILED:`, result.error.message);

        await prisma.warmupEmail.create({
          data: {
            senderDomainId: domain.id,
            receiverDomainId: receiverDomain.id,
            threadId,
            conversationType,
            isInitialEmail: true,
            replyDepth: 0,
            subject: content.subject,
            body: content.body,
            status: "failed",
            warmupDay: currentWarmupDay,
          },
        });

        totalFailed++;
      } else {
        console.log(`[WARMUP-SEND] SUCCESS:`, result.data?.id);

        // Create warmup email record
        await prisma.warmupEmail.create({
          data: {
            senderDomainId: domain.id,
            receiverDomainId: receiverDomain.id,
            resendId: result.data?.id ?? null,
            messageId: result.data?.id ? `<${result.data.id}@resend.dev>` : null,
            threadId,
            conversationType,
            isInitialEmail: true,
            replyDepth: 0,
            subject: content.subject,
            body: content.body,
            status: "sent",
            sentAt: now,
            warmupDay: currentWarmupDay,
          },
        });

        // Update domain counters
        await prisma.domain.update({
          where: { id: domain.id },
          data: {
            warmupSentToday: sentToday + 1,
            warmupLastSentAt: now,
            warmupDay: currentWarmupDay > 0 ? currentWarmupDay : 1,
          },
        });

        totalSent++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.log(`[WARMUP-SEND] EXCEPTION:`, message);
      totalFailed++;
    }
  }

  console.log(`[WARMUP-SEND] Done. Sent: ${totalSent}, Failed: ${totalFailed}`);

  return NextResponse.json({
    success: true,
    sent: totalSent,
    failed: totalFailed,
    processedDomains: warmupDomains.length,
  });
}
