import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json(contact);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { email, firstName, lastName, ...rest } = body;

  if (!email || !firstName || !lastName) {
    return NextResponse.json(
      { error: "Email, first name, and last name are required." },
      { status: 400 }
    );
  }

  const existing = await prisma.contact.findFirst({
    where: { email, NOT: { id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Another contact with this email already exists." },
      { status: 409 }
    );
  }

  const contact = await prisma.contact.update({
    where: { id },
    data: { email, firstName, lastName, ...rest },
  });

  return NextResponse.json(contact);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
