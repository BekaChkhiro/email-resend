import { anthropic } from "./anthropic";

export interface ContactContext {
  firstName: string;
  lastName: string | null;
  title: string | null;
  email: string;
  companyName: string | null;
  companyIndustry: string | null;
  companySize: string | null;
  companySizeRange: string | null;
  companyRevenue: string | null;
  companyFunding: string | null;
  companyType: string | null;
  companyDescription: string | null;
  location: string | null;
  region: string | null;
  country: string | null;
  decisionMaker: boolean | null;
  websiteContent?: string | null;
}

export interface GenerationOptions {
  aiPrompt: string;
  subject: string;
  emailFormat: "html" | "plain_text";
}

export interface GenerationResult {
  body: string;
  tokensUsed: { prompt: number; completion: number; total: number };
}

function buildContactSummary(contact: ContactContext): string {
  const lines: string[] = [];

  lines.push(`Name: ${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ""}`);
  if (contact.title) lines.push(`Title: ${contact.title}`);
  lines.push(`Email: ${contact.email}`);
  if (contact.companyName) lines.push(`Company: ${contact.companyName}`);
  if (contact.companyIndustry) lines.push(`Industry: ${contact.companyIndustry}`);
  if (contact.companySize) lines.push(`Company Size: ${contact.companySize}`);
  if (contact.companySizeRange) lines.push(`Size Range: ${contact.companySizeRange}`);
  if (contact.companyRevenue) lines.push(`Revenue: ${contact.companyRevenue}`);
  if (contact.companyFunding) lines.push(`Funding: ${contact.companyFunding}`);
  if (contact.companyType) lines.push(`Company Type: ${contact.companyType}`);
  if (contact.companyDescription) lines.push(`About Company: ${contact.companyDescription}`);
  if (contact.location) lines.push(`Location: ${contact.location}`);
  if (contact.region) lines.push(`Region: ${contact.region}`);
  if (contact.country) lines.push(`Country: ${contact.country}`);
  if (contact.decisionMaker != null) lines.push(`Decision Maker: ${contact.decisionMaker ? "Yes" : "No"}`);

  if (contact.websiteContent) {
    lines.push("");
    lines.push("--- Company Website Content ---");
    lines.push(contact.websiteContent);
  }

  return lines.join("\n");
}

function buildSystemPrompt(options: GenerationOptions): string {
  const formatInstruction =
    options.emailFormat === "html"
      ? "Return the email body as HTML. Use <p> tags for each paragraph to ensure proper spacing. Use simple HTML tags (p, br, strong, em, a, ul, li) — no full document structure, no <html>/<head>/<body> tags. Do not include a subject line."
      : "Return the email body as plain text. Use blank lines between paragraphs for readability. Do not include a subject line.";

  return `You are an expert email copywriter. Generate a personalized email body based on the user's instructions and the contact's profile data.

Campaign subject line (for context only): "${options.subject}"

Rules:
- Write ONLY the email body content. Do not include the subject line, from/to headers, or signature unless the user's instructions ask for it.
- Personalize the email using the contact data provided.
- If company website content is included, use specific details from it (products, services, mission, recent news) to make the email highly relevant and personalized. Reference concrete things the company does rather than generic statements.
- Keep the tone professional yet personal.
- IMPORTANT: Each sentence or logical thought MUST be in its own separate paragraph. Never write multiple sentences in the same paragraph. In HTML, wrap every sentence in its own <p> tag.
- ${formatInstruction}
- Do not wrap the output in markdown code fences.`;
}

export async function generateEmailForContact(
  contact: ContactContext,
  options: GenerationOptions
): Promise<GenerationResult> {
  const contactSummary = buildContactSummary(contact);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: buildSystemPrompt(options),
    messages: [
      {
        role: "user",
        content: `Instructions:\n${options.aiPrompt}\n\nContact Profile:\n${contactSummary}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const body = textBlock?.text?.trim() ?? "";

  return {
    body,
    tokensUsed: {
      prompt: response.usage.input_tokens,
      completion: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}

export interface BatchGenerationResult {
  results: Map<string, { body: string; error?: undefined } | { body?: undefined; error: string }>;
  totalTokens: { prompt: number; completion: number; total: number };
}

export async function generateEmailsForCampaign(
  contacts: (ContactContext & { id: string })[],
  options: GenerationOptions,
  onProgress?: (completed: number, total: number) => void
): Promise<BatchGenerationResult> {
  const results = new Map<string, { body: string; error?: undefined } | { body?: undefined; error: string }>();
  const totalTokens = { prompt: 0, completion: 0, total: 0 };

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];

    try {
      const result = await generateEmailForContact(contact, options);

      results.set(contact.id, { body: result.body });
      totalTokens.prompt += result.tokensUsed.prompt;
      totalTokens.completion += result.tokensUsed.completion;
      totalTokens.total += result.tokensUsed.total;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";

      // Retry once on rate limit errors
      if (isRateLimitError(err)) {
        const retryAfter = getRetryAfterMs(err);
        await sleep(retryAfter);

        try {
          const result = await generateEmailForContact(contact, options);
          results.set(contact.id, { body: result.body });
          totalTokens.prompt += result.tokensUsed.prompt;
          totalTokens.completion += result.tokensUsed.completion;
          totalTokens.total += result.tokensUsed.total;
        } catch (retryErr) {
          const retryMessage = retryErr instanceof Error ? retryErr.message : "Unknown error";
          results.set(contact.id, { error: `Rate limit retry failed: ${retryMessage}` });
        }
      } else {
        results.set(contact.id, { error: message });
      }
    }

    onProgress?.(i + 1, contacts.length);
  }

  return { results, totalTokens };
}

function isRateLimitError(err: unknown): boolean {
  if (err && typeof err === "object" && "status" in err) {
    return (err as { status: number }).status === 429;
  }
  return false;
}

function getRetryAfterMs(err: unknown): number {
  if (err && typeof err === "object" && "headers" in err) {
    const headers = (err as { headers: Record<string, string> }).headers;
    const retryAfter = headers?.["retry-after"];
    if (retryAfter) {
      const seconds = parseFloat(retryAfter);
      if (!isNaN(seconds)) return seconds * 1000;
    }
  }
  return 5000;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
