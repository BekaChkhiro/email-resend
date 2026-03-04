"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateDomain(id: string, formData: FormData) {
  const fromName = formData.get("fromName") as string;
  const fromEmail = formData.get("fromEmail") as string;

  if (!fromName || !fromEmail) {
    return { error: "From name and from email are required." };
  }

  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) {
    return { error: "Domain not found." };
  }

  // Validate that fromEmail ends with the domain
  if (!fromEmail.endsWith(`@${domain.domain}`)) {
    return { error: `Email must end with @${domain.domain}` };
  }

  await prisma.domain.update({
    where: { id },
    data: { fromName, fromEmail },
  });

  revalidatePath("/domains");
  return { success: true };
}

export async function toggleDomainActive(id: string) {
  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) {
    return { error: "Domain not found." };
  }

  await prisma.domain.update({
    where: { id },
    data: { isActive: !domain.isActive },
  });

  revalidatePath("/domains");
  return { success: true };
}

export async function addDomain(formData: FormData) {
  const domain = (formData.get("domain") as string)?.trim().toLowerCase();
  const fromName = (formData.get("fromName") as string)?.trim();
  const fromEmail = (formData.get("fromEmail") as string)?.trim().toLowerCase();

  if (!domain || !fromName || !fromEmail) {
    return { error: "All fields are required." };
  }

  if (!fromEmail.endsWith(`@${domain}`)) {
    return { error: `Email must end with @${domain}` };
  }

  const existing = await prisma.domain.findUnique({ where: { domain } });
  if (existing) {
    return { error: "This domain already exists." };
  }

  await prisma.domain.create({
    data: { domain, fromName, fromEmail },
  });

  revalidatePath("/domains");
  return { success: true };
}

export async function deleteDomain(id: string) {
  const domain = await prisma.domain.findUnique({
    where: { id },
    include: { campaignEmails: { take: 1 } },
  });

  if (!domain) {
    return { error: "Domain not found." };
  }

  if (domain.campaignEmails.length > 0) {
    return { error: "Cannot delete domain that has been used in campaigns." };
  }

  await prisma.domain.delete({ where: { id } });

  revalidatePath("/domains");
  return { success: true };
}

export async function seedDomains() {
  const count = await prisma.domain.count();
  if (count > 0) {
    return { error: "Domains already exist. Seed is only for initial setup." };
  }

  const domains = [
    { domain: "sendhub.pro", fromName: "John Smith", fromEmail: "hello@sendhub.pro" },
    { domain: "mailreach.io", fromName: "Sarah Johnson", fromEmail: "hello@mailreach.io" },
    { domain: "outboundr.com", fromName: "Michael Davis", fromEmail: "hello@outboundr.com" },
    { domain: "emailflow.dev", fromName: "Emily Wilson", fromEmail: "hello@emailflow.dev" },
    { domain: "postmark.agency", fromName: "David Brown", fromEmail: "hello@postmark.agency" },
  ];

  await prisma.domain.createMany({ data: domains });

  revalidatePath("/domains");
  return { success: true };
}
