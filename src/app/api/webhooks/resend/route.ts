import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/db";

type ResendWebhookEvent = {
  type: string;
  data: {
    email_id: string;
    [key: string]: unknown;
  };
};

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
  bounced: 5,
  failed: 5,
};

export async function POST(request: NextRequest) {
  const body = await request.text();

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  let event: ResendWebhookEvent;

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
      event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ResendWebhookEvent;
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }
  } else {
    console.warn(
      "RESEND_WEBHOOK_SECRET is not set — skipping signature verification"
    );
    event = JSON.parse(body);
  }

  const resendId = event.data.email_id;
  if (!resendId) {
    return NextResponse.json({ error: "Missing email_id" }, { status: 400 });
  }

  const email = await prisma.campaignEmail.findFirst({
    where: { resendId },
  });

  if (!email) {
    // Email not found — may be from a different source, ignore gracefully
    return NextResponse.json({ received: true });
  }

  const currentOrder = STATUS_ORDER[email.status] ?? 0;

  switch (event.type) {
    case "email.delivered": {
      if (currentOrder < STATUS_ORDER.delivered) {
        await prisma.campaignEmail.update({
          where: { id: email.id },
          data: { status: "delivered" },
        });
      }
      break;
    }
    case "email.opened": {
      if (currentOrder < STATUS_ORDER.opened) {
        await prisma.campaignEmail.update({
          where: { id: email.id },
          data: {
            status: "opened",
            openedAt: email.openedAt ?? new Date(),
          },
        });
      }
      break;
    }
    case "email.clicked": {
      await prisma.campaignEmail.update({
        where: { id: email.id },
        data: {
          status: "clicked",
          clickedAt: email.clickedAt ?? new Date(),
          // Also set openedAt if not already set (a click implies an open)
          openedAt: email.openedAt ?? new Date(),
        },
      });
      break;
    }
    case "email.bounced": {
      await prisma.campaignEmail.update({
        where: { id: email.id },
        data: {
          status: "bounced",
          errorMessage: extractBounceReason(event.data),
        },
      });
      break;
    }
    case "email.complained": {
      await prisma.campaignEmail.update({
        where: { id: email.id },
        data: {
          status: "bounced",
          errorMessage: "Spam complaint received",
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}

function extractBounceReason(data: Record<string, unknown>): string {
  if (typeof data.bounce === "object" && data.bounce !== null) {
    const bounce = data.bounce as Record<string, unknown>;
    if (typeof bounce.message === "string") return bounce.message;
  }
  if (typeof data.reason === "string") return data.reason;
  return "Email bounced";
}
