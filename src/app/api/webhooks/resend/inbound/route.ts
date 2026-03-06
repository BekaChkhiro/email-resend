import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/db";

type ResendInboundPayload = {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  headers: Array<{ name: string; value: string }>;
  attachments?: Array<{ filename: string; content: string }>;
};

export async function POST(request: NextRequest) {
  const body = await request.text();

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  let payload: ResendInboundPayload;

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (webhookSecret) {
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: "Missing svix headers" },
        { status: 400 }
      );
    }

    const wh = new Webhook(webhookSecret);
    try {
      payload = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ResendInboundPayload;
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }
  } else {
    console.warn(
      "RESEND_WEBHOOK_SECRET is not set - skipping signature verification"
    );
    payload = JSON.parse(body);
  }

  // Parse headers into a map
  const headersMap: Record<string, string> = {};
  for (const header of payload.headers || []) {
    headersMap[header.name] = header.value;
  }

  // Extract sender email (may be in format "Name <email@domain.com>")
  const fromEmailMatch = payload.from.match(/<([^>]+)>/) || [null, payload.from];
  const fromEmail = fromEmailMatch[1] || payload.from;

  // Extract recipient email
  const toEmail = payload.to[0]?.replace(/<|>/g, "") || "";

  // Get the Message-ID from headers
  const messageId = headersMap["Message-ID"] || headersMap["Message-Id"];

  // Get In-Reply-To header to find the original email
  const inReplyToHeader = headersMap["In-Reply-To"];

  let campaignEmail = null;
  let campaign = null;

  if (inReplyToHeader) {
    // Extract the Resend ID from In-Reply-To header
    // Format is usually: <resend-id@resend.dev>
    const resendId = inReplyToHeader
      .replace(/<|>/g, "")
      .split("@")[0];

    if (resendId) {
      campaignEmail = await prisma.campaignEmail.findFirst({
        where: { resendId },
        include: { campaign: true },
      });

      if (campaignEmail) {
        campaign = campaignEmail.campaign;
      }
    }
  }

  // Find contact by email
  let contact = await prisma.contact.findUnique({
    where: { email: fromEmail },
  });

  // If no contact found and we have a campaign email, try to find by campaign's contact
  if (!contact && campaignEmail) {
    contact = await prisma.contact.findUnique({
      where: { id: campaignEmail.contactId },
    });
  }

  // If still no contact, we can't properly associate this message
  // Create a placeholder or skip? For now, let's still try to find by domain
  if (!contact) {
    // Try to find contact by email domain match (less reliable)
    const emailDomain = fromEmail.split("@")[1];
    contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { email: { contains: emailDomain } },
          { companyDomain: emailDomain },
        ],
      },
    });
  }

  if (!contact) {
    console.warn(`[Inbound] Could not find contact for email: ${fromEmail}`);
    // Still accept the webhook but log the issue
    return NextResponse.json({
      received: true,
      warning: "Contact not found",
    });
  }

  // Create the inbox message
  await prisma.inboxMessage.create({
    data: {
      campaignEmailId: campaignEmail?.id ?? null,
      contactId: contact.id,
      campaignId: campaign?.id ?? null,
      messageId: messageId ?? null,
      inReplyTo: inReplyToHeader ?? null,
      direction: "inbound",
      status: "unread",
      fromEmail,
      toEmail,
      subject: payload.subject || "(No subject)",
      textBody: payload.text ?? null,
      htmlBody: payload.html ?? null,
      receivedAt: new Date(),
    },
  });

  console.log(
    `[Inbound] Created inbox message from ${fromEmail} for contact ${contact.email}`
  );

  return NextResponse.json({ received: true });
}
