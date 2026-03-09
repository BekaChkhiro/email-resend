"use server";

import { prisma } from "@/lib/db";
import { resend } from "@/lib/resend";
import { anthropic } from "@/lib/anthropic";
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

export type AttachmentInfo = {
  filename: string;
  size: number;
  contentType: string;
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
  attachments: AttachmentInfo[];
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
    attachments: (msg.attachments as AttachmentInfo[]) || [],
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
  const attachmentInfos: AttachmentInfo[] = [];
  for (const file of attachmentFiles) {
    if (file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      attachments.push({
        filename: file.name,
        content: Buffer.from(arrayBuffer),
      });
      attachmentInfos.push({
        filename: file.name,
        size: file.size,
        contentType: file.type || "application/octet-stream",
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
        attachments: attachmentInfos,
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

// AI Reply Generation Types
export type AIAction =
  | "generate_reply"
  | "improve"
  | "shorter"
  | "longer"
  | "formal"
  | "friendly"
  | "fix_grammar"
  | "fix_spam";

interface AIReplyRequest {
  action: AIAction;
  currentText: string;
  conversationHistory: Message[];
  contactName: string;
  contactEmail: string;
  customPrompt?: string;
}

export async function generateAIReply(request: AIReplyRequest): Promise<{ text?: string; error?: string }> {
  const { action, currentText, conversationHistory, contactName, customPrompt } = request;

  // Build conversation context
  const conversationContext = conversationHistory
    .slice(-10) // Last 10 messages for context
    .map((msg) => {
      const sender = msg.direction === "inbound" ? contactName : "Me";
      const body = msg.textBody || "(no text content)";
      return `[${sender}]: ${body.slice(0, 500)}${body.length > 500 ? "..." : ""}`;
    })
    .join("\n\n");

  let systemPrompt = "";
  let userPrompt = "";

  switch (action) {
    case "generate_reply":
      systemPrompt = `You are an expert email assistant. Generate a professional, helpful email reply based on the conversation context and user instructions.

Rules:
- Write a natural, human-sounding reply
- Keep it concise but complete
- Be professional yet personable
- Follow the user's specific instructions if provided
- Do not include subject line, greetings like "Dear X" or signatures - just the body
- Write in plain text, no HTML
- If the conversation is in a non-English language, reply in that same language
- If the user's instructions are in a specific language, write the reply in that language`;

      userPrompt = `Here's the email conversation with ${contactName}:

${conversationContext}

${customPrompt ? `User instructions: ${customPrompt}` : "Generate a professional reply to the last message."}`;
      break;

    case "improve":
      systemPrompt = `You are an expert email editor. Improve the given email text while keeping the same meaning and intent.

Rules:
- Make it clearer and more professional
- Fix any awkward phrasing
- Keep the same tone and intent
- Do not add greetings or signatures
- Write in plain text, no HTML
- Keep the same language as the original`;

      userPrompt = `Improve this email reply:

"${currentText}"

Context - conversation with ${contactName}:
${conversationContext}`;
      break;

    case "shorter":
      systemPrompt = `You are an expert email editor. Make the email more concise while keeping the key points.

Rules:
- Remove unnecessary words and phrases
- Keep the main message intact
- Maintain professionalism
- Do not add greetings or signatures
- Write in plain text, no HTML
- Keep the same language as the original`;

      userPrompt = `Make this email reply shorter and more concise:

"${currentText}"`;
      break;

    case "longer":
      systemPrompt = `You are an expert email editor. Expand the email with more detail while keeping it natural.

Rules:
- Add relevant details and context
- Elaborate on key points
- Keep it professional and focused
- Do not add greetings or signatures
- Write in plain text, no HTML
- Keep the same language as the original`;

      userPrompt = `Expand this email reply with more detail:

"${currentText}"

Context - conversation with ${contactName}:
${conversationContext}`;
      break;

    case "formal":
      systemPrompt = `You are an expert email editor. Rewrite the email in a more formal, professional tone.

Rules:
- Use formal language and phrasing
- Remove casual expressions
- Keep the same meaning
- Do not add greetings or signatures
- Write in plain text, no HTML
- Keep the same language as the original`;

      userPrompt = `Rewrite this email reply in a more formal tone:

"${currentText}"`;
      break;

    case "friendly":
      systemPrompt = `You are an expert email editor. Rewrite the email in a warmer, friendlier tone.

Rules:
- Use friendly, approachable language
- Keep it professional but warm
- Keep the same meaning
- Do not add greetings or signatures
- Write in plain text, no HTML
- Keep the same language as the original`;

      userPrompt = `Rewrite this email reply in a friendlier tone:

"${currentText}"`;
      break;

    case "fix_grammar":
      systemPrompt = `You are an expert proofreader. Fix any grammar, spelling, or punctuation errors in the email.

Rules:
- Only fix errors, don't change the style or meaning
- Preserve the original tone
- Do not add greetings or signatures
- Write in plain text, no HTML
- Keep the same language as the original`;

      userPrompt = `Fix any grammar, spelling, or punctuation errors in this email reply:

"${currentText}"`;
      break;

    case "fix_spam":
      systemPrompt = `You are an expert email deliverability specialist. Rewrite the email to avoid spam filters while keeping the same meaning and intent.

Rules:
- Replace spam trigger words with professional alternatives
- Avoid urgency phrases like "act now", "limited time", "hurry"
- Avoid financial spam words like "free money", "cash bonus", "no fees"
- Avoid exaggerated claims like "miracle", "amazing", "incredible"
- Keep the same meaning, tone, and intent
- Make it sound natural and professional
- Do not add greetings or signatures
- Write in plain text, no HTML
- Keep the same language as the original`;

      userPrompt = `Rewrite this email to avoid spam triggers while keeping the same meaning:

"${currentText}"`;
      break;

    default:
      return { error: "Unknown AI action" };
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const text = textBlock?.text?.trim() ?? "";

    return { text };
  } catch (err) {
    console.error("[AI Reply] Error:", err);
    return { error: "AI generation failed. Please try again." };
  }
}

// AI-powered spam check
export interface AISpamCheckResult {
  score: number; // 0-10
  risk: "none" | "low" | "medium" | "high";
  issues: { word: string; reason: string; suggestion: string }[];
  summary: string;
}

export async function checkSpamWithAI(text: string): Promise<AISpamCheckResult | { error: string }> {
  const systemPrompt = `You are an expert email deliverability specialist. Analyze the email for spam triggers and deliverability issues.

You must respond ONLY with valid JSON in this exact format:
{
  "score": <number 0-10>,
  "risk": "<none|low|medium|high>",
  "issues": [
    {"word": "<problematic word/phrase>", "reason": "<why it's problematic>", "suggestion": "<alternative>"}
  ],
  "summary": "<brief summary in 1 sentence>"
}

Scoring guide:
- 0: Perfect, no issues
- 1-3: Low risk, minor issues
- 4-6: Medium risk, should fix
- 7-10: High risk, likely to be flagged as spam

Check for:
1. Spam trigger words (free, urgent, act now, limited time, etc.)
2. Excessive punctuation (!!!, ???, ALL CAPS)
3. Pushy/salesy language
4. Unrealistic promises or claims
5. Pressure tactics and urgency
6. Financial/money-related spam patterns
7. Suspicious phrases that spam filters catch

Be thorough but fair - legitimate business language is OK.`;

  const userPrompt = `Analyze this email for spam triggers:

"${text}"`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const responseText = textBlock?.text?.trim() ?? "";

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { error: "Failed to parse AI response" };
    }

    const result = JSON.parse(jsonMatch[0]) as AISpamCheckResult;
    return result;
  } catch (err) {
    console.error("[AI Spam Check] Error:", err);
    return { error: "AI spam check failed. Please try again." };
  }
}
