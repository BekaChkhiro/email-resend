"use server";

import { prisma } from "@/lib/db";
import { resend } from "@/lib/resend";
import { replaceTemplateVariables } from "@/lib/template";
import { revalidatePath } from "next/cache";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function sendCampaignEmails(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { subject: true, emailFormat: true, delaySeconds: true },
  });

  if (!campaign) {
    return { sentCount: 0, failedCount: 0 };
  }

  const emails = await prisma.campaignEmail.findMany({
    where: { campaignId, status: "pending" },
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

  let sentCount = 0;
  let failedCount = 0;

  console.log("[SEND] Emails to send:", emails.length);

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];

    console.log(`[SEND] [${i + 1}/${emails.length}] To: ${email.contact.email}, From: ${email.domain.fromEmail}, AI: ${!!email.generatedBody}, Template: ${!!email.template}`);

    // Build unsubscribe URL
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/unsubscribe?contactId=${email.contactId}`;

    // Use AI-generated body if available, otherwise use template body
    const rawBody = email.generatedBody ?? email.template?.body ?? "";
    const emailBody = replaceTemplateVariables(
      rawBody,
      email.contact,
      unsubscribeUrl
    );

    // Wrap HTML emails with sender photo header
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const finalBody =
      campaign.emailFormat === "html"
        ? `<div style="margin-bottom:20px"><img src="${appUrl}/giorgi.png" alt="${email.domain.fromName}" style="width:48px;height:48px;border-radius:50%;object-fit:cover" /></div>${emailBody}`
        : emailBody;

    try {
      const result = await resend.emails.send({
        from: `${email.domain.fromName} <${email.domain.fromEmail}>`,
        to: [email.contact.email],
        subject: campaign.subject,
        ...(campaign.emailFormat === "html"
          ? { html: finalBody }
          : { text: finalBody }),
      });

      if (result.error) {
        console.log(`[SEND] [${i + 1}] FAILED (Resend error):`, result.error.message);
        await prisma.campaignEmail.update({
          where: { id: email.id },
          data: {
            status: "failed",
            errorMessage: result.error.message,
          },
        });
        failedCount++;
      } else {
        console.log(`[SEND] [${i + 1}] SUCCESS resendId:`, result.data?.id);
        await prisma.campaignEmail.update({
          where: { id: email.id },
          data: {
            status: "sent",
            resendId: result.data?.id ?? null,
            sentAt: new Date(),
          },
        });
        sentCount++;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.log(`[SEND] [${i + 1}] EXCEPTION:`, message);
      await prisma.campaignEmail.update({
        where: { id: email.id },
        data: {
          status: "failed",
          errorMessage: message,
        },
      });
      failedCount++;
    }

    // Apply delay between sends (skip after last email)
    if (campaign.delaySeconds > 0 && i < emails.length - 1) {
      await sleep(campaign.delaySeconds * 1000);
    }
  }

  // Update campaign status to completed
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "completed" },
  });

  return { sentCount, failedCount };
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

export async function resumeCampaignSending(campaignId: string) {
  console.log("[RESUME] Starting resume for campaign:", campaignId);

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { status: true, subject: true, emailFormat: true, delaySeconds: true },
  });

  if (!campaign) {
    return { error: "Campaign not found." };
  }

  if (campaign.status !== "sending") {
    return { error: `Campaign status is "${campaign.status}", not "sending". Cannot resume.` };
  }

  // Count pending emails
  const pendingCount = await prisma.campaignEmail.count({
    where: { campaignId, status: "pending" },
  });

  if (pendingCount === 0) {
    // All done, mark as completed
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "completed" },
    });
    return { success: true, message: "No pending emails. Campaign marked as completed." };
  }

  console.log("[RESUME] Pending emails:", pendingCount);

  // Get pending emails
  const emails = await prisma.campaignEmail.findMany({
    where: { campaignId, status: "pending" },
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

  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];

    console.log(`[RESUME] [${i + 1}/${emails.length}] To: ${email.contact.email}, From: ${email.domain.fromEmail}`);

    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/unsubscribe?contactId=${email.contactId}`;
    const rawBody = email.generatedBody ?? email.template?.body ?? "";
    const emailBody = replaceTemplateVariables(rawBody, email.contact, unsubscribeUrl);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const finalBody =
      campaign.emailFormat === "html"
        ? `<div style="margin-bottom:20px"><img src="${appUrl}/giorgi.png" alt="${email.domain.fromName}" style="width:48px;height:48px;border-radius:50%;object-fit:cover" /></div>${emailBody}`
        : emailBody;

    try {
      const result = await resend.emails.send({
        from: `${email.domain.fromName} <${email.domain.fromEmail}>`,
        to: [email.contact.email],
        subject: campaign.subject,
        ...(campaign.emailFormat === "html"
          ? { html: finalBody }
          : { text: finalBody }),
      });

      if (result.error) {
        console.log(`[RESUME] [${i + 1}] FAILED:`, result.error.message);
        await prisma.campaignEmail.update({
          where: { id: email.id },
          data: { status: "failed", errorMessage: result.error.message },
        });
        failedCount++;
      } else {
        console.log(`[RESUME] [${i + 1}] SUCCESS:`, result.data?.id);
        await prisma.campaignEmail.update({
          where: { id: email.id },
          data: { status: "sent", resendId: result.data?.id ?? null, sentAt: new Date() },
        });
        sentCount++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.log(`[RESUME] [${i + 1}] EXCEPTION:`, message);
      await prisma.campaignEmail.update({
        where: { id: email.id },
        data: { status: "failed", errorMessage: message },
      });
      failedCount++;
    }

    // Apply delay between sends
    if (campaign.delaySeconds > 0 && i < emails.length - 1) {
      console.log(`[RESUME] Sleeping ${campaign.delaySeconds} seconds...`);
      await sleep(campaign.delaySeconds * 1000);
    }
  }

  // Mark campaign as completed
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "completed" },
  });

  console.log("[RESUME] Done! Sent:", sentCount, "Failed:", failedCount);

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");

  return { success: true, sentCount, failedCount, totalProcessed: emails.length };
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
