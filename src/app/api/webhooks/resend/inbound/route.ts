import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/db";
import { resend } from "@/lib/resend";

type ResendWebhookPayload = {
  type: string;
  created_at: string;
  data: {
    from: string;
    to: string[];
    subject: string;
    text?: string;
    html?: string;
    email_id: string;
    message_id?: string;
    headers?: Array<{ name: string; value: string }>;
    attachments?: Array<{ filename: string; content: string }>;
  };
};

export async function POST(request: NextRequest) {
  const body = await request.text();

  console.log("[Inbound] Received webhook");

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  let payload: ResendWebhookPayload;

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (webhookSecret) {
    if (!svixId || !svixTimestamp || !svixSignature) {
      console.log("[Inbound] Missing svix headers");
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
      }) as ResendWebhookPayload;
    } catch (err) {
      console.log("[Inbound] Invalid webhook signature:", err);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }
  } else {
    console.warn(
      "[Inbound] RESEND_WEBHOOK_SECRET is not set - skipping signature verification"
    );
    payload = JSON.parse(body);
  }

  // Extract data from the nested structure
  const emailData = payload.data;

  console.log("[Inbound] Full payload:", JSON.stringify(payload, null, 2));

  if (!emailData || !emailData.from) {
    console.log("[Inbound] Invalid payload structure:", payload);
    return NextResponse.json(
      { error: "Invalid payload structure" },
      { status: 400 }
    );
  }

  console.log("[Inbound] Processing email from:", emailData.from);

  // If text/html not in webhook, try to fetch from Resend API
  let textBody = emailData.text ?? null;
  let htmlBody = emailData.html ?? null;

  if (!textBody && !htmlBody && emailData.email_id) {
    console.log("[Inbound] Fetching email content from API for:", emailData.email_id);
    try {
      // Use receiving.get() for inbound emails
      const emailDetails = await resend.emails.receiving.get(emailData.email_id);
      console.log("[Inbound] API response:", JSON.stringify(emailDetails.data, null, 2));
      if (emailDetails.data) {
        const data = emailDetails.data as { text?: string; html?: string };
        textBody = data.text ?? null;
        htmlBody = data.html ?? null;
        console.log("[Inbound] Fetched text:", textBody?.slice(0, 100));
        console.log("[Inbound] Fetched html:", htmlBody?.slice(0, 100));
      }
    } catch (err) {
      console.log("[Inbound] Could not fetch email content:", err);
    }
  }

  // Parse headers into a map if they exist
  const headersMap: Record<string, string> = {};
  if (emailData.headers) {
    for (const header of emailData.headers) {
      headersMap[header.name] = header.value;
    }
  }

  // Extract sender email (may be in format "Name <email@domain.com>")
  const fromEmailMatch = emailData.from.match(/<([^>]+)>/);
  const fromEmail = fromEmailMatch ? fromEmailMatch[1] : emailData.from;

  // Extract recipient email
  const toEmail = emailData.to?.[0]?.replace(/<|>/g, "") || "";

  // Get the Message-ID (either from headers or directly from data)
  const messageId = emailData.message_id || headersMap["Message-ID"] || headersMap["Message-Id"];

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
        console.log("[Inbound] Linked to campaign:", campaign.name);
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

  // If still no contact, try to find by company domain (but not for common email providers)
  if (!contact) {
    const emailDomain = fromEmail.split("@")[1];
    const commonDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "mail.ru", "yandex.ru"];

    if (emailDomain && !commonDomains.includes(emailDomain.toLowerCase())) {
      contact = await prisma.contact.findFirst({
        where: { companyDomain: emailDomain },
      });
    }
  }

  // If still no contact, create a new one
  if (!contact) {
    console.log(`[Inbound] Creating new contact for email: ${fromEmail}`);

    // Try to extract name from "Name <email>" format
    const nameMatch = emailData.from.match(/^"?([^"<]+)"?\s*</);
    const fullName = nameMatch ? nameMatch[1].trim() : fromEmail.split("@")[0];
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    contact = await prisma.contact.create({
      data: {
        email: fromEmail,
        firstName,
        lastName,
        fullName,
      },
    });

    console.log(`[Inbound] Created new contact: ${contact.id}`);
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
      subject: emailData.subject || "(No subject)",
      textBody: textBody,
      htmlBody: htmlBody,
      receivedAt: new Date(),
    },
  });

  console.log(
    `[Inbound] Created inbox message from ${fromEmail} for contact ${contact.email}`
  );

  return NextResponse.json({ received: true });
}
