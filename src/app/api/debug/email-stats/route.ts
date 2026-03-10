import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const total = await prisma.contact.count();
  const withStatus = await prisma.contact.count({ where: { emailStatus: { not: null } } });
  const withoutStatus = await prisma.contact.count({ where: { emailStatus: null } });
  const emptyStatus = await prisma.contact.count({ where: { emailStatus: "" } });
  
  const validCount = await prisma.contact.count({ where: { emailStatus: "valid" } });
  const invalidCount = await prisma.contact.count({ where: { emailStatus: "invalid" } });
  const catchAllCount = await prisma.contact.count({ where: { emailStatus: "catch-all" } });
  const unknownCount = await prisma.contact.count({ where: { emailStatus: "unknown" } });
  const disposableCount = await prisma.contact.count({ where: { emailStatus: "disposable" } });
  
  const sample = await prisma.contact.findMany({
    take: 10,
    select: { email: true, emailStatus: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    total,
    withStatus,
    withoutStatus,
    emptyStatus,
    breakdown: {
      valid: validCount,
      invalid: invalidCount,
      catchAll: catchAllCount,
      unknown: unknownCount,
      disposable: disposableCount,
    },
    sample: sample.map(c => ({ email: c.email, status: c.emailStatus }))
  });
}
