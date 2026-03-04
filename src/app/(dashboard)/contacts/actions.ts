"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getContacts(search?: string) {
  const where = search
    ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { companyName: { contains: search, mode: "insensitive" as const } },
          { title: { contains: search, mode: "insensitive" as const } },
          { country: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  return prisma.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function createContact(formData: FormData) {
  const email = formData.get("email") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const companyName = (formData.get("companyName") as string) || null;
  const companyDomain = (formData.get("companyDomain") as string) || null;
  const companyIndustry = (formData.get("companyIndustry") as string) || null;
  const title = (formData.get("title") as string) || null;
  const location = (formData.get("location") as string) || null;
  const country = (formData.get("country") as string) || null;
  const linkedin = (formData.get("linkedin") as string) || null;

  if (!email || !firstName || !lastName) {
    return { error: "Email, first name, and last name are required." };
  }

  const existing = await prisma.contact.findUnique({ where: { email } });
  if (existing) {
    return { error: "A contact with this email already exists." };
  }

  await prisma.contact.create({
    data: {
      email, firstName, lastName, companyName, companyDomain,
      companyIndustry, title, location, country, linkedin,
    },
  });

  revalidatePath("/contacts");
  return { success: true };
}

export async function updateContact(id: string, formData: FormData) {
  const email = formData.get("email") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const companyName = (formData.get("companyName") as string) || null;
  const companyDomain = (formData.get("companyDomain") as string) || null;
  const companyIndustry = (formData.get("companyIndustry") as string) || null;
  const title = (formData.get("title") as string) || null;
  const location = (formData.get("location") as string) || null;
  const country = (formData.get("country") as string) || null;
  const linkedin = (formData.get("linkedin") as string) || null;

  if (!email || !firstName || !lastName) {
    return { error: "Email, first name, and last name are required." };
  }

  const existing = await prisma.contact.findFirst({
    where: { email, NOT: { id } },
  });
  if (existing) {
    return { error: "Another contact with this email already exists." };
  }

  await prisma.contact.update({
    where: { id },
    data: {
      email, firstName, lastName, companyName, companyDomain,
      companyIndustry, title, location, country, linkedin,
    },
  });

  revalidatePath("/contacts");
  return { success: true };
}

export async function deleteContact(id: string) {
  await prisma.contact.delete({ where: { id } });
  revalidatePath("/contacts");
  return { success: true };
}
