"use server";

import { prisma } from "@/lib/db";
import { resend } from "@/lib/resend";
import { replaceTemplateVariables } from "@/lib/template";
import { revalidatePath } from "next/cache";
import { anthropic } from "@/lib/anthropic";

// AI Prompt Action Types
export type AIPromptAction =
  | "improve"
  | "shorter"
  | "longer"
  | "formal"
  | "friendly"
  | "fix_grammar"
  | "generate_custom";

export async function prepareCampaignEmails(campaignId: string) {
  console.log("[SEND] Starting prepareCampaignEmails for:", campaignId);

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      templates: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!campaign) {
    return { error: "Campaign not found." };
  }
  if (campaign.status !== "draft") {
    return { error: "Only draft campaigns can be prepared for sending." };
  }
  // Check for AI-generated emails
  const aiEmailCount = await prisma.campaignEmail.count({
    where: { campaignId, aiGenerated: true },
  });
  const hasAiEmails = aiEmailCount > 0;

  console.log("[SEND] Campaign status:", campaign.status);
  console.log("[SEND] Templates:", campaign.templates.length);
  console.log("[SEND] AI emails in DB:", aiEmailCount);
  console.log("[SEND] Selected contacts:", campaign.selectedContactIds.length);

  if (campaign.templates.length < 2 && !hasAiEmails) {
    return { error: "At least 2 template versions are required, or save AI-generated emails." };
  }
  if (campaign.selectedContactIds.length === 0) {
    return { error: "No contacts selected for this campaign." };
  }

  // Fetch active domains
  const domains = await prisma.domain.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  console.log("[SEND] Active domains:", domains.length, domains.map(d => d.fromEmail));

  if (domains.length === 0) {
    return { error: "No active domains available." };
  }

  // Fetch selected contacts (exclude unsubscribed)
  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: campaign.selectedContactIds },
      isUnsubscribed: false,
    },
  });

  console.log("[SEND] Eligible contacts:", contacts.length);

  if (contacts.length === 0) {
    return { error: "All selected contacts are unsubscribed." };
  }

  const templates = campaign.templates;

  // Check for existing AI-generated emails to preserve them
  const existingAiEmails = await prisma.campaignEmail.findMany({
    where: { campaignId, aiGenerated: true },
    select: { contactId: true, generatedBody: true },
  });

  const aiBodyByContact = new Map(
    existingAiEmails.map((e) => [e.contactId, e.generatedBody])
  );

  // Build campaign email records with round-robin assignment
  const emailRecords = contacts.map((contact, index) => {
    const domain = domains[index % domains.length];
    const template = templates.length > 0 ? templates[index % templates.length] : null;
    const generatedBody = aiBodyByContact.get(contact.id) ?? null;

    return {
      campaignId,
      contactId: contact.id,
      domainId: domain.id,
      ...(template ? { templateId: template.id } : {}),
      generatedBody,
      aiGenerated: generatedBody !== null,
    };
  });

  console.log("[SEND] Email records to create:", emailRecords.length);
  console.log("[SEND] Sample record:", JSON.stringify(emailRecords[0], null, 2));

  // Create all records and update campaign status in a transaction
  await prisma.$transaction([
    // Clear any existing email records (in case of re-prepare)
    prisma.campaignEmail.deleteMany({ where: { campaignId } }),
    // Create new email records (preserving AI-generated bodies)
    prisma.campaignEmail.createMany({ data: emailRecords }),
    // Update campaign status to sending
    prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "sending", sentAt: new Date() },
    }),
  ]);

  console.log("[SEND] Transaction complete. Cron job will handle sending.");

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");

  return {
    success: true,
    totalEmails: emailRecords.length,
    domainsUsed: domains.length,
    templatesUsed: templates.length,
    message: "Campaign started! Emails will be sent automatically in the background.",
  };
}

export async function createTemplate(campaignId: string, formData: FormData) {
  const versionName = (formData.get("versionName") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();

  if (!versionName) {
    return { error: "Version name is required." };
  }
  if (!body) {
    return { error: "Body is required." };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { templates: { select: { sortOrder: true } } },
  });

  if (!campaign) {
    return { error: "Campaign not found." };
  }
  if (campaign.status !== "draft") {
    return { error: "Only draft campaigns can be edited." };
  }

  const maxSort = campaign.templates.reduce(
    (max, t) => Math.max(max, t.sortOrder),
    -1
  );

  await prisma.campaignTemplate.create({
    data: {
      campaignId,
      versionName,
      body,
      sortOrder: maxSort + 1,
    },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

export async function updateTemplate(templateId: string, formData: FormData) {
  const versionName = (formData.get("versionName") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();

  if (!versionName) {
    return { error: "Version name is required." };
  }
  if (!body) {
    return { error: "Body is required." };
  }

  const template = await prisma.campaignTemplate.findUnique({
    where: { id: templateId },
    include: { campaign: { select: { id: true, status: true } } },
  });

  if (!template) {
    return { error: "Template not found." };
  }
  if (template.campaign.status !== "draft") {
    return { error: "Only draft campaigns can be edited." };
  }

  await prisma.campaignTemplate.update({
    where: { id: templateId },
    data: { versionName, body },
  });

  revalidatePath(`/campaigns/${template.campaign.id}`);
  return { success: true };
}

export async function updateSelectedContacts(
  campaignId: string,
  contactIds: string[]
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { status: true },
  });

  if (!campaign) {
    return { error: "Campaign not found." };
  }
  if (campaign.status !== "draft") {
    return { error: "Only draft campaigns can be edited." };
  }

  // Verify all contact IDs exist and are subscribed
  const validContacts = await prisma.contact.findMany({
    where: {
      id: { in: contactIds },
      isUnsubscribed: false,
    },
    select: { id: true },
  });

  const validIds = validContacts.map((c) => c.id);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { selectedContactIds: validIds },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

export async function updateAiPrompt(campaignId: string, aiPrompt: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { status: true },
  });

  if (!campaign) {
    return { error: "Campaign not found." };
  }
  if (campaign.status !== "draft") {
    return { error: "Only draft campaigns can be edited." };
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { aiPrompt: aiPrompt.trim() || null },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

export async function updateSubjectTemplate(campaignId: string, subject: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { status: true },
  });

  if (!campaign) {
    return { error: "Campaign not found." };
  }
  if (campaign.status !== "draft") {
    return { error: "Only draft campaigns can be edited." };
  }

  const trimmedSubject = subject.trim();
  if (!trimmedSubject) {
    return { error: "Subject line cannot be empty." };
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { subject: trimmedSubject },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

export async function deleteTemplate(templateId: string) {
  const template = await prisma.campaignTemplate.findUnique({
    where: { id: templateId },
    include: { campaign: { select: { id: true, status: true } } },
  });

  if (!template) {
    return { error: "Template not found." };
  }
  if (template.campaign.status !== "draft") {
    return { error: "Only draft campaigns can be edited." };
  }

  await prisma.campaignTemplate.delete({ where: { id: templateId } });

  revalidatePath(`/campaigns/${template.campaign.id}`);
  return { success: true };
}

export async function saveGeneratedEmails(
  campaignId: string,
  emails: { contactId: string; body: string }[]
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { templates: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  if (!campaign) {
    return { error: "Campaign not found." };
  }
  if (campaign.status !== "draft") {
    return { error: "Only draft campaigns can be edited." };
  }

  const domains = await prisma.domain.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (domains.length === 0) {
    return { error: "No active domains available." };
  }

  const defaultTemplate = campaign.templates[0];

  // Upsert campaign emails with AI-generated bodies
  for (let i = 0; i < emails.length; i++) {
    const { contactId, body } = emails[i];
    const domain = domains[i % domains.length];

    const existing = await prisma.campaignEmail.findFirst({
      where: { campaignId, contactId },
    });

    if (existing) {
      await prisma.campaignEmail.update({
        where: { id: existing.id },
        data: { generatedBody: body, aiGenerated: true },
      });
    } else {
      await prisma.campaignEmail.create({
        data: {
          campaignId,
          contactId,
          domainId: domain.id,
          ...(defaultTemplate ? { templateId: defaultTemplate.id } : {}),
          generatedBody: body,
          aiGenerated: true,
        },
      });
    }
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, savedCount: emails.length };
}

export async function updateGeneratedEmail(
  campaignEmailId: string,
  body: string
) {
  const email = await prisma.campaignEmail.findUnique({
    where: { id: campaignEmailId },
    include: { campaign: { select: { id: true, status: true } } },
  });

  if (!email) {
    return { error: "Campaign email not found." };
  }
  if (email.campaign.status !== "draft") {
    return { error: "Only draft campaigns can be edited." };
  }

  await prisma.campaignEmail.update({
    where: { id: campaignEmailId },
    data: { generatedBody: body, aiGenerated: true },
  });

  revalidatePath(`/campaigns/${email.campaign.id}`);
  return { success: true };
}

export async function getGeneratedEmails(campaignId: string) {
  const emails = await prisma.campaignEmail.findMany({
    where: { campaignId, aiGenerated: true },
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
    },
    orderBy: { contact: { firstName: "asc" } },
  });

  return emails.map((e) => ({
    id: e.id,
    contactId: e.contact.id,
    contactName: `${e.contact.firstName} ${e.contact.lastName ?? ""}`.trim(),
    contactEmail: e.contact.email,
    companyName: e.contact.companyName,
    generatedBody: e.generatedBody ?? "",
  }));
}

// AI Prompt Generation
interface AIPromptRequest {
  action: AIPromptAction;
  currentText: string;
  customPrompt?: string;
}

export async function generateAIPrompt(request: AIPromptRequest): Promise<{ text?: string; error?: string }> {
  const { action, currentText, customPrompt } = request;

  let systemPrompt = "";
  let userPrompt = "";

  switch (action) {
    case "generate_custom":
      systemPrompt = `You are an expert email marketing strategist. Generate clear, effective AI prompt instructions for personalized email generation.

Rules:
- Write instructions that ChatGPT can follow to generate personalized emails
- Include placeholders like {{firstName}}, {{companyName}}, {{companyIndustry}}, etc.
- Be specific about tone, length, and style
- Focus on the user's specific request
- Write in a clear, instructional format
- Output only the prompt text, no explanations`;

      userPrompt = `Create an AI prompt for email generation based on this request:

"${customPrompt}"

If helpful, use these available placeholders: {{firstName}}, {{lastName}}, {{title}}, {{companyName}}, {{companyIndustry}}, {{companySize}}, {{companyRevenue}}, {{companyFunding}}, {{companyType}}, {{companyDescription}}, {{location}}, {{region}}, {{country}}, {{decisionMaker}}`;
      break;

    case "improve":
      systemPrompt = `You are an expert email marketing strategist. Improve the given AI prompt instructions while keeping the same intent.

Rules:
- Make it clearer and more specific
- Add missing details that would help generate better emails
- Keep the same intent and tone
- Use available placeholders effectively
- Output only the improved prompt text, no explanations`;

      userPrompt = `Improve this AI prompt for email generation:

"${currentText}"`;
      break;

    case "shorter":
      systemPrompt = `You are an expert editor. Make the AI prompt more concise while keeping the key instructions.

Rules:
- Remove unnecessary words and phrases
- Keep the main instructions intact
- Maintain clarity
- Output only the shortened prompt text, no explanations`;

      userPrompt = `Make this AI prompt shorter and more concise:

"${currentText}"`;
      break;

    case "longer":
      systemPrompt = `You are an expert email marketing strategist. Expand the AI prompt with more detailed instructions.

Rules:
- Add helpful details about tone, style, and format
- Include more specific guidance for the AI
- Suggest using more placeholders for personalization
- Keep it focused and practical
- Output only the expanded prompt text, no explanations`;

      userPrompt = `Expand this AI prompt with more detail:

"${currentText}"

Available placeholders: {{firstName}}, {{lastName}}, {{title}}, {{companyName}}, {{companyIndustry}}, {{companySize}}, {{companyRevenue}}, {{companyFunding}}, {{companyType}}, {{companyDescription}}, {{location}}, {{region}}, {{country}}, {{decisionMaker}}`;
      break;

    case "formal":
      systemPrompt = `You are an expert editor. Rewrite the AI prompt to generate more formal, professional emails.

Rules:
- Adjust instructions to produce formal tone
- Add guidance for professional language
- Keep the same structure and intent
- Output only the revised prompt text, no explanations`;

      userPrompt = `Rewrite this AI prompt to generate more formal emails:

"${currentText}"`;
      break;

    case "friendly":
      systemPrompt = `You are an expert editor. Rewrite the AI prompt to generate warmer, friendlier emails.

Rules:
- Adjust instructions to produce friendly tone
- Add guidance for approachable language
- Keep the same structure and intent
- Output only the revised prompt text, no explanations`;

      userPrompt = `Rewrite this AI prompt to generate friendlier emails:

"${currentText}"`;
      break;

    case "fix_grammar":
      systemPrompt = `You are an expert proofreader. Fix any grammar, spelling, or punctuation errors in the AI prompt.

Rules:
- Only fix errors, don't change the meaning
- Preserve the original style and intent
- Output only the corrected prompt text, no explanations`;

      userPrompt = `Fix any grammar, spelling, or punctuation errors in this AI prompt:

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
    console.error("[AI Prompt] Error:", err);
    return { error: "AI generation failed. Please try again." };
  }
}
