import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";

const CSV_TO_DB_MAP: Record<string, string> = {
  email: "email",
  first_name: "firstName",
  last_name: "lastName",
  full_name: "fullName",
  title: "title",
  list_name: "listName",
  email_type: "emailType",
  email_status: "emailStatus",
  location: "location",
  locality: "locality",
  region: "region",
  country: "country",
  linkedin: "linkedin",
  profile_url: "profileUrl",
  domain: "domain",
  company: "companyName",
  company_domain: "companyDomain",
  company_industry: "companyIndustry",
  company_subindustry: "companySubindustry",
  company_size: "companySize",
  company_size_range: "companySizeRange",
  company_founded: "companyFounded",
  company_revenue: "companyRevenue",
  company_funding: "companyFunding",
  company_type: "companyType",
  company_linkedin: "companyLinkedin",
  company_twitter: "companyTwitter",
  company_facebook: "companyFacebook",
  company_description: "companyDescription",
  linkedin_profile_url: "linkedinProfileUrl",
  company_last_funding_round: "companyLastFundingRound",
  company_last_funding_amount: "companyLastFundingAmount",
  company_last_funding_at: "companyLastFundingAt",
  company_location: "companyLocation",
  company_street: "companyStreet",
  company_locality: "companyLocality",
  company_region: "companyRegion",
  company_country: "companyCountry",
  company_postal_code: "companyPostalCode",
  other_work_emails: "otherWorkEmails",
  "Decision Maker": "decisionMaker",
};

const INT_FIELDS = new Set(["companySize", "companyFounded"]);
const BOOL_FIELDS = new Set(["decisionMaker"]);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { contacts: rows, mapping } = body as {
    contacts: Record<string, string>[];
    mapping: Record<string, string>;
  };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No contacts provided." }, { status: 400 });
  }

  const fieldMap = mapping || CSV_TO_DB_MAP;

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Get existing emails to skip duplicates
  const existingEmails = new Set(
    (await prisma.contact.findMany({ select: { email: true } })).map((c) => c.email)
  );

  const toCreate: Record<string, unknown>[] = [];

  for (const row of rows) {
    const mapped: Record<string, unknown> = {};

    for (const [csvCol, dbField] of Object.entries(fieldMap)) {
      const value = row[csvCol]?.trim();
      if (!value) continue;

      if (INT_FIELDS.has(dbField)) {
        const num = parseInt(value);
        if (!isNaN(num)) mapped[dbField] = num;
      } else if (BOOL_FIELDS.has(dbField)) {
        mapped[dbField] = value.toUpperCase() === "TRUE";
      } else {
        mapped[dbField] = value;
      }
    }

    if (!mapped.email || !mapped.firstName || !mapped.lastName) {
      skipped++;
      continue;
    }

    if (existingEmails.has(mapped.email as string)) {
      skipped++;
      continue;
    }

    existingEmails.add(mapped.email as string);
    toCreate.push(mapped);
  }

  // Batch insert in chunks of 100
  const CHUNK_SIZE = 100;
  for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
    const chunk = toCreate.slice(i, i + CHUNK_SIZE);
    try {
      await prisma.contact.createMany({
        data: chunk as Prisma.ContactCreateManyInput[],
        skipDuplicates: true,
      });
      imported += chunk.length;
    } catch (err) {
      errors.push(`Batch ${Math.floor(i / CHUNK_SIZE) + 1} failed: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({ imported, skipped, errors });
}
