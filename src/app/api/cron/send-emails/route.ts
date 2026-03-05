import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resend } from "@/lib/resend";
import { replaceTemplateVariables } from "@/lib/template";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[CRON] Starting email send job...");

  // Find campaigns that are in "sending" status
  const sendingCampaigns = await prisma.campaign.findMany({
    where: { status: "sending" },
    select: {
      id: true,
      subject: true,
      emailFormat: true,
      delaySeconds: true,
    },
  });

  if (sendingCampaigns.length === 0) {
    console.log("[CRON] No campaigns in sending status");
    return NextResponse.json({ message: "No campaigns to process" });
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const campaign of sendingCampaigns) {
    console.log(`[CRON] Processing campaign: ${campaign.id}`);

    // Get the last sent email to check delay
    const lastSentEmail = await prisma.campaignEmail.findFirst({
      where: {
        campaignId: campaign.id,
        status: { in: ["sent", "delivered"] },
      },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    });

    // Check if enough time has passed since last send
    if (lastSentEmail?.sentAt && campaign.delaySeconds > 0) {
      const timeSinceLastSend =
        (Date.now() - lastSentEmail.sentAt.getTime()) / 1000;

      if (timeSinceLastSend < campaign.delaySeconds) {
        const waitTime = Math.ceil(campaign.delaySeconds - timeSinceLastSend);
        console.log(
          `[CRON] Campaign ${campaign.id}: waiting ${waitTime}s before next send`
        );
        continue;
      }
    }

    // Get one pending email to send
    const pendingEmail = await prisma.campaignEmail.findFirst({
      where: {
        campaignId: campaign.id,
        status: "pending",
      },
      include: {
        contact: {
          select: { email: true, firstName: true, companyName: true },
        },
        domain: {
          select: { fromName: true, fromEmail: true },
        },
        template: {
          select: { body: true },
        },
      },
      orderBy: { id: "asc" },
    });

    if (!pendingEmail) {
      // No more pending emails, mark campaign as completed
      console.log(`[CRON] Campaign ${campaign.id}: no pending emails, marking completed`);
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "completed" },
      });
      continue;
    }

    console.log(`[CRON] Sending to: ${pendingEmail.contact.email}`);

    // Build email
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/unsubscribe?contactId=${pendingEmail.contactId}`;
    const rawBody = pendingEmail.generatedBody ?? pendingEmail.template?.body ?? "";
    const emailBody = replaceTemplateVariables(
      rawBody,
      pendingEmail.contact,
      unsubscribeUrl
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const finalBody =
      campaign.emailFormat === "html"
        ? `<div style="margin-bottom:20px"><img src="${appUrl}/giorgi.png" alt="${pendingEmail.domain.fromName}" style="width:48px;height:48px;border-radius:50%;object-fit:cover" /></div>${emailBody}`
        : emailBody;

    try {
      const result = await resend.emails.send({
        from: `${pendingEmail.domain.fromName} <${pendingEmail.domain.fromEmail}>`,
        to: [pendingEmail.contact.email],
        subject: campaign.subject,
        ...(campaign.emailFormat === "html"
          ? { html: finalBody }
          : { text: finalBody }),
      });

      if (result.error) {
        console.log(`[CRON] FAILED:`, result.error.message);
        await prisma.campaignEmail.update({
          where: { id: pendingEmail.id },
          data: { status: "failed", errorMessage: result.error.message },
        });
        totalFailed++;
      } else {
        console.log(`[CRON] SUCCESS:`, result.data?.id);
        await prisma.campaignEmail.update({
          where: { id: pendingEmail.id },
          data: {
            status: "sent",
            resendId: result.data?.id ?? null,
            sentAt: new Date(),
          },
        });
        totalSent++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.log(`[CRON] EXCEPTION:`, message);
      await prisma.campaignEmail.update({
        where: { id: pendingEmail.id },
        data: { status: "failed", errorMessage: message },
      });
      totalFailed++;
    }
  }

  console.log(`[CRON] Done. Sent: ${totalSent}, Failed: ${totalFailed}`);

  return NextResponse.json({
    success: true,
    sent: totalSent,
    failed: totalFailed,
    processedCampaigns: sendingCampaigns.length,
  });
}
