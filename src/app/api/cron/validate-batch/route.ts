import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateEmail, parseValidationResult } from "@/lib/emailValidator";

const BATCH_SIZE = 5;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on the server" },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token !== secret) return unauthorized();

  const startedAt = Date.now();

  const remainingBefore = await prisma.contact.count({
    where: { OR: [{ emailStatus: null }, { emailStatus: "" }] },
  });

  const batch = await prisma.contact.findMany({
    where: { OR: [{ emailStatus: null }, { emailStatus: "" }] },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  const results: Array<{ email: string; status: string | null; error?: string }> = [];

  for (const contact of batch) {
    try {
      const raw = await validateEmail(contact.email);
      const parsed = parseValidationResult(raw);
      const status: string = parsed.isDisposable ? "disposable" : parsed.status;

      await prisma.contact.update({
        where: { id: contact.id },
        data: { emailStatus: status },
      });

      results.push({ email: contact.email, status });
    } catch (err) {
      results.push({
        email: contact.email,
        status: null,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const remainingAfter = await prisma.contact.count({
    where: { OR: [{ emailStatus: null }, { emailStatus: "" }] },
  });

  return NextResponse.json({
    success: true,
    processed: results.length,
    succeeded: results.filter((r) => r.status !== null).length,
    failed: results.filter((r) => r.status === null).length,
    remainingBefore,
    remainingAfter,
    durationMs: Date.now() - startedAt,
    results,
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
