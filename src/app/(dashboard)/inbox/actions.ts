"use server";

import { prisma } from "@/lib/db";
import { resend } from "@/lib/resend";
import { revalidatePath } from "next/cache";

export type Conversation = {
  id: string; // contactId_campaignId or contactId
  contactId: string;
  contactName: string;
  contactEmail: string;
  companyName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  lastMessage: {
    subject: string;
    preview: string;
    receivedAt: string;
    direction: "inbound" | "outbound";
  };
  unreadCount: number;
};

export type Message = {
  id: string;
  direction: "inbound" | "outbound";
  status: "unread" | "read" | "archived";
  fromEmail: string;
  toEmail: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  receivedAt: string;
  sentAt: string | null;
};

export async function getConversations(): Promise<Conversation[]> {
  // Get all inbox messages grouped by contact and campaign
  const messages = await prisma.inboxMessage.findMany({
    where: {
      status: { not: "archived" },
    },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          companyName: true,
        },
      },
      campaign: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { receivedAt: "desc" },
  });

  // Group by contact + campaign
  const conversationMap = new Map<string, {
    contact: typeof messages[0]["contact"];
    campaign: typeof messages[0]["campaign"];
    messages: typeof messages;
  }>();

  for (const msg of messages) {
    const key = msg.campaignId
      ? `${msg.contactId}_${msg.campaignId}`
      : msg.contactId;

    if (!conversationMap.has(key)) {
      conversationMap.set(key, {
        contact: msg.contact,
        campaign: msg.campaign,
        messages: [],
      });
    }
    conversationMap.get(key)!.messages.push(msg);
  }

  // Transform to Conversation type
  const conversations: Conversation[] = [];

  for (const [key, data] of conversationMap) {
    const lastMsg = data.messages[0];
    const unreadCount = data.messages.filter(
      (m) => m.status === "unread" && m.direction === "inbound"
    ).length;

    // Create preview from text body
    const preview = lastMsg.textBody
      ? lastMsg.textBody.slice(0, 100).replace(/\n/g, " ") +
        (lastMsg.textBody.length > 100 ? "..." : "")
      : "(No preview)";

    conversations.push({
      id: key,
      contactId: data.contact.id,
      contactName: `${data.contact.firstName} ${data.contact.lastName || ""}`.trim(),
      contactEmail: data.contact.email,
      companyName: data.contact.companyName,
      campaignId: data.campaign?.id ?? null,
      campaignName: data.campaign?.name ?? null,
      lastMessage: {
        subject: lastMsg.subject,
        preview,
        receivedAt: lastMsg.receivedAt.toISOString(),
        direction: lastMsg.direction as "inbound" | "outbound",
      },
      unreadCount,
    });
  }

  // Sort by last message date
  conversations.sort(
    (a, b) =>
      new Date(b.lastMessage.receivedAt).getTime() -
      new Date(a.lastMessage.receivedAt).getTime()
  );

  return conversations;
}

export async function getConversationMessages(
  contactId: string,
  campaignId: string | null
): Promise<Message[]> {
  const messages = await prisma.inboxMessage.findMany({
    where: {
      contactId,
      ...(campaignId ? { campaignId } : { campaignId: null }),
    },
    orderBy: { receivedAt: "asc" },
  });

  return messages.map((msg) => ({
    id: msg.id,
    direction: msg.direction as "inbound" | "outbound",
    status: msg.status as "unread" | "read" | "archived",
    fromEmail: msg.fromEmail,
    toEmail: msg.toEmail,
    subject: msg.subject,
    textBody: msg.textBody,
    htmlBody: msg.htmlBody,
    receivedAt: msg.receivedAt.toISOString(),
    sentAt: msg.sentAt?.toISOString() ?? null,
  }));
}

export async function sendReply(formData: FormData) {
  const contactId = formData.get("contactId") as string;
  const campaignId = formData.get("campaignId") as string | null;
  const body = formData.get("body") as string;
  const replyToMessageId = formData.get("replyToMessageId") as string | null;
  const attachmentFiles = formData.getAll("attachments") as File[];

  if (!contactId || !body?.trim()) {
    return { error: "Contact and message body are required." };
  }

  // Process attachments
  const attachments: { filename: string; content: Buffer }[] = [];
  for (const file of attachmentFiles) {
    if (file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      attachments.push({
        filename: file.name,
        content: Buffer.from(arrayBuffer),
      });
    }
  }

  // Get contact
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) {
    return { error: "Contact not found." };
  }

  // Get the last message to reply to
  const lastMessage = await prisma.inboxMessage.findFirst({
    where: {
      contactId,
      ...(campaignId ? { campaignId } : {}),
    },
    include: {
      campaignEmail: {
        include: {
          domain: true,
        },
      },
    },
    orderBy: { receivedAt: "desc" },
  });

  // Try to get the domain from the original campaign email
  let domain = lastMessage?.campaignEmail?.domain ?? null;

  // If no domain from campaign email, try to find from any message in this conversation
  if (!domain && campaignId) {
    const campaignEmail = await prisma.campaignEmail.findFirst({
      where: { campaignId, contactId },
      include: { domain: true },
    });
    domain = campaignEmail?.domain ?? null;
  }

  // Fallback to first active domain
  if (!domain) {
    domain = await prisma.domain.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!domain) {
    return { error: "No active sending domain available." };
  }

  // Prepare subject
  const subject = lastMessage
    ? lastMessage.subject.startsWith("Re:")
      ? lastMessage.subject
      : `Re: ${lastMessage.subject}`
    : "Follow-up";

  // Prepare headers for threading
  const headers: Record<string, string> = {};
  if (lastMessage?.messageId) {
    headers["In-Reply-To"] = lastMessage.messageId;
    headers["References"] = lastMessage.messageId;
  }

  try {
    // Send via Resend
    const result = await resend.emails.send({
      from: `${domain.fromName} <${domain.fromEmail}>`,
      to: [contact.email],
      subject,
      text: body,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (result.error) {
      return { error: result.error.message };
    }

    // Create inbox message for the reply
    await prisma.inboxMessage.create({
      data: {
        contactId,
        campaignId: campaignId || null,
        messageId: result.data?.id ? `<${result.data.id}@resend.dev>` : null,
        inReplyTo: lastMessage?.messageId ?? null,
        direction: "outbound",
        status: "read",
        fromEmail: domain.fromEmail,
        toEmail: contact.email,
        subject,
        textBody: body,
        receivedAt: new Date(),
        sentAt: new Date(),
        resendId: result.data?.id ?? null,
      },
    });

    revalidatePath("/inbox");
    return { success: true };
  } catch (err) {
    console.error("[Inbox Reply] Error:", err);
    return { error: "Failed to send reply. Please try again." };
  }
}

export async function markAsRead(messageIds: string[]) {
  if (messageIds.length === 0) return { success: true };

  await prisma.inboxMessage.updateMany({
    where: { id: { in: messageIds } },
    data: { status: "read" },
  });

  revalidatePath("/inbox");
  return { success: true };
}

export async function markAsUnread(messageIds: string[]) {
  if (messageIds.length === 0) return { success: true };

  await prisma.inboxMessage.updateMany({
    where: { id: { in: messageIds } },
    data: { status: "unread" },
  });

  revalidatePath("/inbox");
  return { success: true };
}

export async function archiveConversation(
  contactId: string,
  campaignId: string | null
) {
  await prisma.inboxMessage.updateMany({
    where: {
      contactId,
      ...(campaignId ? { campaignId } : { campaignId: null }),
    },
    data: { status: "archived" },
  });

  revalidatePath("/inbox");
  return { success: true };
}

export async function getInboxStats() {
  const unreadCount = await prisma.inboxMessage.count({
    where: {
      status: "unread",
      direction: "inbound",
    },
  });

  return { unreadCount };
}
