import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

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

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({ contacts, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, firstName, lastName, ...rest } = body;

  if (!email || !firstName || !lastName) {
    return NextResponse.json(
      { error: "Email, first name, and last name are required." },
      { status: 400 }
    );
  }

  const existing = await prisma.contact.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A contact with this email already exists." },
      { status: 409 }
    );
  }

  const contact = await prisma.contact.create({
    data: { email, firstName, lastName, ...rest },
  });

  return NextResponse.json(contact, { status: 201 });
}
