import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resend } from "@/lib/resend";
import { generateWarmupEmail } from "@/lib/warmup-content";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_REPLY_DEPTH = 2; // Max 3 emails per thread (initial + 2 replies)
const MIN_DELAY_MINUTES = 5; // Wait at least 5 minutes before replying

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[WARMUP-REPLY] Starting warmup reply job...");

  const now = new Date();
  const minSentTime = new Date(now.getTime() - MIN_DELAY_MINUTES * 60 * 1000);

  // Find warmup emails that need a reply
  // Criteria:
  // - Status is "sent" or "delivered"
  // - Reply depth is less than MAX_REPLY_DEPTH
  // - Sent at least MIN_DELAY_MINUTES ago
  // - No newer email in the same thread
  const emailsNeedingReply = await prisma.warmupEmail.findMany({
    where: {
      status: { in: ["sent", "delivered"] },
      replyDepth: { lt: MAX_REPLY_DEPTH },
      sentAt: {
        not: null,
        lt: minSentTime,
      },
    },
    include: {
      senderDomain: true,
      receiverDomain: true,
    },
    orderBy: { sentAt: "asc" },
    take: 10, // Process up to 10 replies per cron run
  });

  if (emailsNeedingReply.length === 0) {
    console.log("[WARMUP-REPLY] No emails need replies");
    return NextResponse.json({ message: "No emails need replies" });
  }

  // Filter to only the latest email in each thread
  const threadLatestEmails = new Map<string, typeof emailsNeedingReply[0]>();
  for (const email of emailsNeedingReply) {
    const existing = threadLatestEmails.get(email.threadId);
    if (!existing || (email.sentAt && existing.sentAt && email.sentAt > existing.sentAt)) {
      threadLatestEmails.set(email.threadId, email);
    }
  }

  // Check if there's already a newer email in each thread
  const latestEmails: typeof emailsNeedingReply = [];
  for (const email of threadLatestEmails.values()) {
    const newerEmailInThread = await prisma.warmupEmail.findFirst({
      where: {
        threadId: email.threadId,
        sentAt: { gt: email.sentAt! },
      },
    });

    if (!newerEmailInThread) {
      latestEmails.push(email);
    }
  }

  console.log(`[WARMUP-REPLY] Found ${latestEmails.length} threads needing replies`);

  let totalSent = 0;
  let totalFailed = 0;

  for (const email of latestEmails) {
    // The receiver becomes the sender for the reply
    const replySender = email.receiverDomain;
    const replyReceiver = email.senderDomain;

    // Check if both domains are still active and warmup enabled
    if (!replySender.isActive || !replySender.warmupEnabled) {
      console.log(`[WARMUP-REPLY] Reply sender ${replySender.domain} not active/enabled`);
      continue;
    }

    if (!replyReceiver.isActive) {
      console.log(`[WARMUP-REPLY] Reply receiver ${replyReceiver.domain} not active`);
      continue;
    }

    try {
      const content = await generateWarmupEmail({
        senderName: replySender.fromName,
        receiverName: replyReceiver.fromName,
        conversationType: email.conversationType,
        isReply: true,
        previousBody: email.body,
        replyDepth: email.replyDepth,
      });

      const replySubject = email.subject.startsWith("Re: ")
        ? email.subject
        : `Re: ${email.subject}`;

      console.log(
        `[WARMUP-REPLY] ${replySender.fromEmail} -> ${replyReceiver.fromEmail}: "${replySubject}"`
      );

      // Build headers for threading
      const headers: Record<string, string> = {
        "X-Warmup-Thread": email.threadId,
      };

      if (email.messageId) {
        headers["In-Reply-To"] = email.messageId;
        headers["References"] = email.messageId;
      }

      const result = await resend.emails.send({
        from: `${replySender.fromName} <${replySender.fromEmail}>`,
        to: [replyReceiver.fromEmail],
        subject: replySubject,
        text: content.body,
        headers,
      });

      if (result.error) {
        console.log(`[WARMUP-REPLY] FAILED:`, result.error.message);

        await prisma.warmupEmail.create({
          data: {
            senderDomainId: replySender.id,
            receiverDomainId: replyReceiver.id,
            threadId: email.threadId,
            conversationType: email.conversationType,
            isInitialEmail: false,
            replyDepth: email.replyDepth + 1,
            inReplyTo: email.messageId,
            subject: replySubject,
            body: content.body,
            status: "failed",
            warmupDay: replySender.warmupDay,
          },
        });

        totalFailed++;
      } else {
        console.log(`[WARMUP-REPLY] SUCCESS:`, result.data?.id);

        // Mark original email as replied
        await prisma.warmupEmail.update({
          where: { id: email.id },
          data: { status: "replied" },
        });

        // Create reply record
        await prisma.warmupEmail.create({
          data: {
            senderDomainId: replySender.id,
            receiverDomainId: replyReceiver.id,
            resendId: result.data?.id ?? null,
            messageId: result.data?.id ? `<${result.data.id}@resend.dev>` : null,
            inReplyTo: email.messageId,
            threadId: email.threadId,
            conversationType: email.conversationType,
            isInitialEmail: false,
            replyDepth: email.replyDepth + 1,
            subject: replySubject,
            body: content.body,
            status: "sent",
            sentAt: now,
            warmupDay: replySender.warmupDay,
          },
        });

        totalSent++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.log(`[WARMUP-REPLY] EXCEPTION:`, message);
      totalFailed++;
    }
  }

  console.log(`[WARMUP-REPLY] Done. Sent: ${totalSent}, Failed: ${totalFailed}`);

  return NextResponse.json({
    success: true,
    sent: totalSent,
    failed: totalFailed,
    processedThreads: latestEmails.length,
  });
}
