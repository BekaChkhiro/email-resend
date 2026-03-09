import { anthropic } from "./anthropic";
import { checkForSpamWords, sanitizeContent } from "./spam-filter";
import { WarmupConversationType } from "@/generated/prisma/client";

const CONVERSATION_PROMPTS: Record<WarmupConversationType, string> = {
  project_update:
    "Write a brief project status update email. Mention a specific project milestone or deliverable.",
  meeting_scheduling:
    "Write an email to schedule a brief meeting or call. Suggest a general timeframe.",
  quick_question:
    "Write a quick professional question about a work-related topic or collaboration.",
  follow_up:
    "Write a follow-up email checking in on a previous conversation or request.",
  document_request:
    "Write an email requesting a document, file, or information needed for work.",
  general_checkin:
    "Write a general check-in email to stay in touch professionally.",
};

const CONVERSATION_SUBJECTS: Record<WarmupConversationType, string[]> = {
  project_update: [
    "Quick update on our progress",
    "Project milestone reached",
    "Status update",
    "Progress report",
    "Update from our end",
  ],
  meeting_scheduling: [
    "Time for a quick sync?",
    "Can we connect this week?",
    "Meeting request",
    "Quick call?",
    "Scheduling a brief chat",
  ],
  quick_question: [
    "Quick question for you",
    "Need your input",
    "Brief question",
    "Your thoughts?",
    "Quick clarification needed",
  ],
  follow_up: [
    "Following up",
    "Checking in",
    "Re: our conversation",
    "Just following up",
    "Quick follow-up",
  ],
  document_request: [
    "Document request",
    "Need a quick file",
    "Can you send over...",
    "Quick request",
    "File needed",
  ],
  general_checkin: [
    "Checking in",
    "How are things going?",
    "Quick hello",
    "Touching base",
    "Hope all is well",
  ],
};

export function getRandomConversationType(): WarmupConversationType {
  const types = Object.values(WarmupConversationType) as WarmupConversationType[];
  return types[Math.floor(Math.random() * types.length)];
}

export function getRandomSubject(type: WarmupConversationType): string {
  const subjects = CONVERSATION_SUBJECTS[type];
  return subjects[Math.floor(Math.random() * subjects.length)];
}

interface GenerateWarmupEmailParams {
  senderName: string;
  receiverName: string;
  conversationType: WarmupConversationType;
  isReply?: boolean;
  previousBody?: string;
  replyDepth?: number;
}

interface WarmupEmailContent {
  subject: string;
  body: string;
}

const MAX_RETRIES = 3;

export async function generateWarmupEmail(
  params: GenerateWarmupEmailParams
): Promise<WarmupEmailContent> {
  const {
    senderName,
    receiverName,
    conversationType,
    isReply = false,
    previousBody,
    replyDepth = 0,
  } = params;

  const conversationPrompt = CONVERSATION_PROMPTS[conversationType];

  let userPrompt: string;

  if (isReply && previousBody) {
    userPrompt = `Write a natural reply to this email:

Previous email:
${previousBody}

Rules:
- Keep it brief (1-3 sentences)
- Sound natural and professional
- Continue the conversation naturally
- This is reply #${replyDepth + 1} in the thread, so wrap up gracefully if needed
- Sign with just "${senderName}"`;
  } else {
    userPrompt = `${conversationPrompt}

Rules:
- Keep it brief (2-4 sentences)
- Sound natural and professional
- Address them as "${receiverName}"
- Sign with just "${senderName}"
- No formal greetings like "Dear" or "Hello"
- No company names or specific details that would be fabricated`;
  }

  const systemPrompt = `You are writing natural business emails between colleagues. Your emails should:
- Be concise (2-4 sentences for new emails, 1-3 for replies)
- Sound like real communication between professionals
- NEVER use spam-triggering words like: free, urgent, act now, amazing, guaranteed, click here, discount, offer, deal, limited, exclusive, congratulations, winner, prize
- Have a casual but professional tone
- Not include any links or URLs
- Not include any marketing language
- Return ONLY valid JSON with "body" field (and "subject" field for new emails)

Return JSON in this exact format:
${isReply ? '{"body": "your reply text"}' : '{"subject": "brief subject", "body": "your email text"}'}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      const rawText = textBlock?.text?.trim() ?? "";

      // Parse JSON response
      const parsed = JSON.parse(rawText);

      let body = parsed.body ?? "";
      let subject = parsed.subject ?? getRandomSubject(conversationType);

      // Check for spam words and sanitize if found
      const bodyCheck = checkForSpamWords(body);
      const subjectCheck = checkForSpamWords(subject);

      if (bodyCheck.hasSpamWords || subjectCheck.hasSpamWords) {
        // Retry if spam words found and we have attempts left
        if (attempt < MAX_RETRIES - 1) {
          continue;
        }
        // On last attempt, sanitize the content
        body = sanitizeContent(body);
        subject = sanitizeContent(subject);
      }

      return { subject, body };
    } catch {
      if (attempt === MAX_RETRIES - 1) {
        // Fallback content on final failure
        return {
          subject: getRandomSubject(conversationType),
          body: isReply
            ? `Thanks for your message. I'll get back to you on this soon.\n\n${senderName}`
            : `Hi ${receiverName},\n\nJust wanted to touch base. Let me know if you have a moment to connect.\n\n${senderName}`,
        };
      }
    }
  }

  // Should never reach here, but TypeScript requires return
  return {
    subject: getRandomSubject(conversationType),
    body: `Hi ${receiverName},\n\nHope you're doing well.\n\n${senderName}`,
  };
}

export function generateThreadId(): string {
  return `warmup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
