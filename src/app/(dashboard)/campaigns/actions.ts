"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createCampaign(formData: FormData) {
  const name = formData.get("name") as string;
  const emailFormat = formData.get("emailFormat") as string;
  const delaySeconds = parseInt(formData.get("delaySeconds") as string) || 0;
  const timezone = formData.get("timezone") as string || null;
  const sendStartHour = timezone ? parseInt(formData.get("sendStartHour") as string) : null;
  const sendEndHour = timezone ? parseInt(formData.get("sendEndHour") as string) : null;
  const sendDaysRaw = formData.get("sendDays") as string;
  const sendDays = sendDaysRaw ? JSON.parse(sendDaysRaw) as number[] : [1, 2, 3, 4, 5];

  if (!name) {
    return { error: "Campaign name is required." };
  }

  // Subject will be set later via subject template editor
  const subject = "{{firstName}} - Quick question";

  if (emailFormat !== "html" && emailFormat !== "plain_text") {
    return { error: "Email format must be html or plain_text." };
  }

  if (delaySeconds < 0) {
    return { error: "Delay must be a non-negative number." };
  }

  if (sendStartHour !== null && sendEndHour !== null && sendStartHour >= sendEndHour) {
    return { error: "Start hour must be before end hour." };
  }

  if (timezone && sendDays.length === 0) {
    return { error: "At least one send day must be selected." };
  }

  const campaign = await prisma.campaign.create({
    data: {
      name,
      subject,
      emailFormat,
      delaySeconds,
      timezone,
      sendStartHour,
      sendEndHour,
      sendDays,
    },
  });

  revalidatePath("/campaigns");
  return { success: true, id: campaign.id };
}

export async function updateCampaign(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const emailFormat = formData.get("emailFormat") as string;
  const delaySeconds = parseInt(formData.get("delaySeconds") as string) || 0;
  const timezone = formData.get("timezone") as string || null;
  const sendStartHour = timezone ? parseInt(formData.get("sendStartHour") as string) : null;
  const sendEndHour = timezone ? parseInt(formData.get("sendEndHour") as string) : null;
  const sendDaysRaw = formData.get("sendDays") as string;
  const sendDays = sendDaysRaw ? JSON.parse(sendDaysRaw) as number[] : [1, 2, 3, 4, 5];

  if (!name) {
    return { error: "Campaign name is required." };
  }

  if (emailFormat !== "html" && emailFormat !== "plain_text") {
    return { error: "Email format must be html or plain_text." };
  }

  if (sendStartHour !== null && sendEndHour !== null && sendStartHour >= sendEndHour) {
    return { error: "Start hour must be before end hour." };
  }

  if (timezone && sendDays.length === 0) {
    return { error: "At least one send day must be selected." };
  }

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return { error: "Campaign not found." };
  }

  if (campaign.status !== "draft") {
    return { error: "Only draft campaigns can be edited." };
  }

  await prisma.campaign.update({
    where: { id },
    data: {
      name,
      emailFormat,
      delaySeconds,
      timezone,
      sendStartHour,
      sendEndHour,
      sendDays,
    },
  });

  revalidatePath("/campaigns");
  return { success: true };
}

type TemplateInput = {
  id?: string;
  versionName: string;
  body: string;
  sortOrder: number;
};

export async function saveTemplates(campaignId: string, templates: TemplateInput[]) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { templates: true },
  });

  if (!campaign) {
    return { error: "Campaign not found." };
  }

  if (campaign.status !== "draft") {
    return { error: "Only draft campaigns can be edited." };
  }

  if (templates.length < 2) {
    return { error: "At least 2 template versions are required." };
  }

  for (const t of templates) {
    if (!t.body.trim()) {
      return { error: `Template "${t.versionName}" body cannot be empty.` };
    }
    if (!t.versionName.trim()) {
      return { error: "Version name cannot be empty." };
    }
  }

  const existingIds = campaign.templates.map((t) => t.id);
  const incomingIds = templates.filter((t) => t.id).map((t) => t.id!);
  const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

  await prisma.$transaction([
    // Delete removed templates
    ...(toDelete.length > 0
      ? [prisma.campaignTemplate.deleteMany({ where: { id: { in: toDelete } } })]
      : []),
    // Upsert each template
    ...templates.map((t) =>
      t.id
        ? prisma.campaignTemplate.update({
            where: { id: t.id },
            data: {
              versionName: t.versionName,
              body: t.body,
              sortOrder: t.sortOrder,
            },
          })
        : prisma.campaignTemplate.create({
            data: {
              campaignId,
              versionName: t.versionName,
              body: t.body,
              sortOrder: t.sortOrder,
            },
          })
    ),
  ]);

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  return { success: true };
}

export async function deleteCampaign(id: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return { error: "Campaign not found." };
  }

  if (campaign.status === "sending") {
    return { error: "Cannot delete a campaign that is currently sending." };
  }

  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/campaigns");
  return { success: true };
}
