/**
 * Background warmup worker — runs inside the Next.js server process.
 *
 * Replaces the cron-job.org -> /api/cron/warmup-send & /warmup-reply path
 * with an in-process loop. Single-flight (no parallel ticks), atomic DB
 * claims (no double-send races), monotonic day calculation, Tbilisi
 * timezone, hard-fails when CRON_SECRET is missing (not relevant here
 * since worker bypasses HTTP).
 *
 * Each tick:
 *   1. SEND PASS — for each warmup-enabled domain, atomically claim a
 *      send-slot if today's quota isn't exhausted, then send via Resend.
 *   2. REPLY PASS — for each thread that needs a reply, atomically claim
 *      the source email (mark `replyDepth` incremented on the reply row),
 *      then send the reply.
 *
 * Tick interval is 90s by default — gives ~96 ticks/day, enough to spread
 * sends throughout the day at the maximum daily-limit of 20.
 */

import { prisma } from "./db";
import { resend } from "./resend";
import {
  generateWarmupEmail,
  generateThreadId,
  getRandomConversationType,
} from "./warmup-content";
import {
  getDailyLimit,
  isWarmupComplete,
  WARMUP_DURATION_DAYS,
} from "./warmup-schedule";
import {
  getCurrentWarmupDay,
  shouldResetDailyCounter,
} from "./warmup-day";

const TICK_MS = 90_000; // 90 seconds between ticks
const IDLE_TICK_MS = 600_000; // 10 minutes when nothing to do
const STARTUP_DELAY_MS = 30_000; // wait for server to fully boot
const MAX_REPLY_DEPTH = 2;
const REPLY_DELAY_MINUTES = 5;

type WorkerState = {
  running: boolean;
  ticking: boolean;
  startedAt: Date | null;
  lastTickAt: Date | null;
  lastTickResult: {
    sent: number;
    replied: number;
    failed: number;
    domains: number;
  } | null;
  totals: {
    sent: number;
    replied: number;
    failed: number;
    completed: number;
  };
  errors: number;
  lastError: string | null;
};

declare global {
  var __warmupWorker: WorkerState | undefined;
  var __warmupWorkerTimer: NodeJS.Timeout | undefined;
}

const state: WorkerState =
  globalThis.__warmupWorker ?? {
    running: false,
    ticking: false,
    startedAt: null,
    lastTickAt: null,
    lastTickResult: null,
    totals: { sent: 0, replied: 0, failed: 0, completed: 0 },
    errors: 0,
    lastError: null,
  };

globalThis.__warmupWorker = state;

export function getWarmupWorkerState(): Readonly<WorkerState> {
  return { ...state };
}

// ============================================================
// SEND PASS
// ============================================================

async function runSendPass(): Promise<{ sent: number; failed: number; completed: number }> {
  const now = new Date();
  const domains = await prisma.domain.findMany({
    where: { warmupEnabled: true, isActive: true },
    orderBy: { warmupLastSentAt: { sort: "asc", nulls: "first" } },
  });

  if (domains.length === 0) {
    return { sent: 0, failed: 0, completed: 0 };
  }

  let sent = 0;
  let failed = 0;
  let completed = 0;

  for (const domain of domains) {
    // Monotonic day calculation from warmupStartedAt (no day-skip bug).
    const currentDay = getCurrentWarmupDay(domain.warmupStartedAt, now);

    // Mark complete if past schedule.
    if (isWarmupComplete(currentDay)) {
      await prisma.domain.update({
        where: { id: domain.id },
        data: {
          warmupEnabled: false,
          warmupCompletedAt: now,
          warmupDay: WARMUP_DURATION_DAYS,
        },
      });
      console.log(`[warmup] ${domain.domain}: complete (day ${currentDay})`);
      completed++;
      continue;
    }

    // If domain's stored day is stale, catch it up (monotonic, never skips).
    if (currentDay > domain.warmupDay) {
      await prisma.domain.update({
        where: { id: domain.id },
        data: { warmupDay: currentDay, warmupSentToday: 0 },
      });
      domain.warmupDay = currentDay;
      domain.warmupSentToday = 0;
    }

    // Daily counter reset (Tbilisi midnight).
    let sentToday = domain.warmupSentToday;
    if (shouldResetDailyCounter(domain.warmupLastSentAt, now)) {
      sentToday = 0;
    }

    const dailyLimit = getDailyLimit(currentDay);
    if (sentToday >= dailyLimit) continue;

    // Atomic claim: only succeed if counter is still below limit.
    const claimed = await prisma.$executeRaw`
      UPDATE domains
      SET warmup_sent_today = CASE
            WHEN warmup_last_sent_at IS NULL OR warmup_last_sent_at < ${startOfTbilisiDayUtc(now)}::timestamp
            THEN 1
            ELSE warmup_sent_today + 1
          END,
          warmup_last_sent_at = ${now}
      WHERE id = ${domain.id}
        AND warmup_enabled = true
        AND is_active = true
        AND (
          warmup_last_sent_at IS NULL
          OR warmup_last_sent_at < ${startOfTbilisiDayUtc(now)}::timestamp
          OR warmup_sent_today < ${dailyLimit}
        )
    `;
    if (claimed === 0) continue;

    // Pick a receiver — round-robin by lowest receivedAt-style, exclude self.
    const receiver = await prisma.domain.findFirst({
      where: {
        id: { not: domain.id },
        warmupEnabled: true,
        isActive: true,
      },
      orderBy: { warmupLastSentAt: { sort: "asc", nulls: "first" } },
    });
    if (!receiver) {
      // Roll back our claim
      await prisma.$executeRaw`
        UPDATE domains SET warmup_sent_today = warmup_sent_today - 1 WHERE id = ${domain.id}
      `;
      continue;
    }

    const conversationType = getRandomConversationType();
    const threadId = generateThreadId();

    try {
      const content = await generateWarmupEmail({
        senderName: domain.fromName,
        receiverName: receiver.fromName,
        conversationType,
        isReply: false,
      });

      const result = await resend.emails.send({
        from: `${domain.fromName} <${domain.fromEmail}>`,
        to: [receiver.fromEmail],
        subject: content.subject,
        text: content.body,
        headers: { "X-Warmup-Thread": threadId },
      });

      if (result.error) {
        console.error(`[warmup] send ${domain.fromEmail} → ${receiver.fromEmail} FAILED:`, result.error.message);
        await prisma.warmupEmail.create({
          data: {
            senderDomainId: domain.id,
            receiverDomainId: receiver.id,
            threadId,
            conversationType,
            isInitialEmail: true,
            replyDepth: 0,
            subject: content.subject,
            body: content.body,
            status: "failed",
            warmupDay: currentDay,
          },
        });
        failed++;
        // Roll back the slot we claimed since the send didn't go out.
        await prisma.$executeRaw`
          UPDATE domains SET warmup_sent_today = GREATEST(warmup_sent_today - 1, 0) WHERE id = ${domain.id}
        `;
      } else {
        await prisma.warmupEmail.create({
          data: {
            senderDomainId: domain.id,
            receiverDomainId: receiver.id,
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
            warmupDay: currentDay,
          },
        });
        sent++;
        console.log(
          `[warmup] sent ${domain.fromEmail} → ${receiver.fromEmail} (day ${currentDay}, ${sentToday + 1}/${dailyLimit})`
        );
      }
    } catch (err) {
      failed++;
      console.error(`[warmup] send exception:`, err instanceof Error ? err.message : err);
      await prisma.$executeRaw`
        UPDATE domains SET warmup_sent_today = GREATEST(warmup_sent_today - 1, 0) WHERE id = ${domain.id}
      `;
    }
  }

  return { sent, failed, completed };
}

// ============================================================
// REPLY PASS
// ============================================================

async function runReplyPass(): Promise<{ replied: number; failed: number }> {
  const now = new Date();
  const minSentTime = new Date(now.getTime() - REPLY_DELAY_MINUTES * 60 * 1000);

  // Candidate: status sent/delivered, depth < MAX, sent at least N min ago,
  // and no later email in the same thread (a reply already exists ⇒ skip).
  const candidates = await prisma.warmupEmail.findMany({
    where: {
      status: { in: ["sent", "delivered"] },
      replyDepth: { lt: MAX_REPLY_DEPTH },
      sentAt: { not: null, lt: minSentTime },
    },
    include: { senderDomain: true, receiverDomain: true },
    orderBy: { sentAt: "asc" },
    take: 20,
  });

  if (candidates.length === 0) return { replied: 0, failed: 0 };

  let replied = 0;
  let failed = 0;

  for (const email of candidates) {
    if (!email.sentAt) continue;

    // Skip if a later email already exists in this thread (someone replied).
    const later = await prisma.warmupEmail.findFirst({
      where: { threadId: email.threadId, sentAt: { gt: email.sentAt } },
      select: { id: true },
    });
    if (later) continue;

    const replySender = email.receiverDomain;
    const replyReceiver = email.senderDomain;

    // Both sides must still be warmup-enabled & active.
    if (!replySender.isActive || !replySender.warmupEnabled) continue;
    if (!replyReceiver.isActive || !replyReceiver.warmupEnabled) continue;

    // Check sender's daily quota before replying.
    const replyDay = getCurrentWarmupDay(replySender.warmupStartedAt, now);
    if (isWarmupComplete(replyDay)) continue;
    const limit = getDailyLimit(replyDay);
    const sentToday = shouldResetDailyCounter(replySender.warmupLastSentAt, now)
      ? 0
      : replySender.warmupSentToday;
    if (sentToday >= limit) continue;

    // Atomic claim on the original email: only the first claimant wins.
    const claimed = await prisma.$executeRaw`
      UPDATE warmup_emails
      SET status = 'replied'
      WHERE id = ${email.id}::uuid
        AND status IN ('sent', 'delivered')
    `;
    if (claimed === 0) continue;

    try {
      const content = await generateWarmupEmail({
        senderName: replySender.fromName,
        receiverName: replyReceiver.fromName,
        conversationType: email.conversationType,
        isReply: true,
        previousBody: email.body,
        replyDepth: email.replyDepth,
      });

      const subject = email.subject.startsWith("Re: ")
        ? email.subject
        : `Re: ${email.subject}`;

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
        subject,
        text: content.body,
        headers,
      });

      if (result.error) {
        // Roll the original back so we can retry on next tick.
        await prisma.warmupEmail.update({
          where: { id: email.id },
          data: { status: "sent" },
        });
        await prisma.warmupEmail.create({
          data: {
            senderDomainId: replySender.id,
            receiverDomainId: replyReceiver.id,
            threadId: email.threadId,
            conversationType: email.conversationType,
            isInitialEmail: false,
            replyDepth: email.replyDepth + 1,
            inReplyTo: email.messageId,
            subject,
            body: content.body,
            status: "failed",
            warmupDay: replyDay,
          },
        });
        failed++;
        console.error(`[warmup] reply ${replySender.fromEmail} → ${replyReceiver.fromEmail} FAILED:`, result.error.message);
      } else {
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
            subject,
            body: content.body,
            status: "sent",
            sentAt: now,
            warmupDay: replyDay,
          },
        });

        // Bump the replier's daily counter atomically.
        await prisma.$executeRaw`
          UPDATE domains
          SET warmup_sent_today = CASE
                WHEN warmup_last_sent_at IS NULL OR warmup_last_sent_at < ${startOfTbilisiDayUtc(now)}::timestamp
                THEN 1
                ELSE warmup_sent_today + 1
              END,
              warmup_last_sent_at = ${now}
          WHERE id = ${replySender.id}
        `;

        replied++;
        console.log(
          `[warmup] reply ${replySender.fromEmail} → ${replyReceiver.fromEmail} (depth ${email.replyDepth + 1})`
        );
      }
    } catch (err) {
      failed++;
      console.error(`[warmup] reply exception:`, err instanceof Error ? err.message : err);
      await prisma.warmupEmail.update({
        where: { id: email.id },
        data: { status: "sent" },
      });
    }
  }

  return { replied, failed };
}

// ============================================================
// TICK / LOOP
// ============================================================

/** Returns the UTC Date that corresponds to the start of "today" in Tbilisi. */
function startOfTbilisiDayUtc(now: Date): Date {
  // Get YYYY-MM-DD in Tbilisi, then construct UTC midnight for that day,
  // then subtract 4 hours so that "Tbilisi midnight" lands at UTC 20:00 prior.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  // Tbilisi is UTC+4 year-round.
  return new Date(`${y}-${m}-${d}T00:00:00+04:00`);
}

async function tick(): Promise<{ nextDelayMs: number }> {
  if (state.ticking) return { nextDelayMs: TICK_MS };
  state.ticking = true;
  state.lastTickAt = new Date();

  try {
    const sendResult = await runSendPass();
    const replyResult = await runReplyPass();

    const summary = {
      sent: sendResult.sent,
      replied: replyResult.replied,
      failed: sendResult.failed + replyResult.failed,
      domains: 0,
    };

    state.totals.sent += sendResult.sent;
    state.totals.replied += replyResult.replied;
    state.totals.failed += summary.failed;
    state.totals.completed += sendResult.completed;
    state.lastTickResult = summary;

    const didWork = sendResult.sent + replyResult.replied + summary.failed > 0;
    return { nextDelayMs: didWork ? TICK_MS : IDLE_TICK_MS };
  } catch (err) {
    state.errors++;
    state.lastError = err instanceof Error ? err.message : String(err);
    console.error("[warmup] tick error:", err);
    return { nextDelayMs: TICK_MS };
  } finally {
    state.ticking = false;
  }
}

async function loop() {
  while (state.running) {
    const { nextDelayMs } = await tick();
    if (!state.running) break;
    await new Promise((r) => setTimeout(r, nextDelayMs));
  }
}

export function startWarmupWorker() {
  if (state.running) {
    console.log("[warmup] already running");
    return;
  }
  state.running = true;
  state.startedAt = new Date();
  console.log(
    `[warmup] starting — tick=${TICK_MS / 1000}s, idle=${IDLE_TICK_MS / 1000}s, max_depth=${MAX_REPLY_DEPTH}, reply_delay=${REPLY_DELAY_MINUTES}min`
  );

  if (globalThis.__warmupWorkerTimer) clearTimeout(globalThis.__warmupWorkerTimer);
  globalThis.__warmupWorkerTimer = setTimeout(() => {
    loop().catch((err) => {
      state.running = false;
      state.lastError = err instanceof Error ? err.message : String(err);
      console.error("[warmup] loop exited:", err);
    });
  }, STARTUP_DELAY_MS);
}

export function stopWarmupWorker() {
  state.running = false;
  if (globalThis.__warmupWorkerTimer) {
    clearTimeout(globalThis.__warmupWorkerTimer);
    globalThis.__warmupWorkerTimer = undefined;
  }
  console.log("[warmup] stopped");
}
