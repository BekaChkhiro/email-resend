import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const contactId = request.nextUrl.searchParams.get("contactId");

  if (!contactId) {
    return NextResponse.redirect(
      new URL("/unsubscribe?status=invalid", request.url)
    );
  }

  try {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { id: true, isUnsubscribed: true },
    });

    if (!contact) {
      return NextResponse.redirect(
        new URL("/unsubscribe?status=not-found", request.url)
      );
    }

    if (contact.isUnsubscribed) {
      return NextResponse.redirect(
        new URL("/unsubscribe?status=already", request.url)
      );
    }

    await prisma.contact.update({
      where: { id: contactId },
      data: { isUnsubscribed: true },
    });

    return NextResponse.redirect(
      new URL("/unsubscribe?status=success", request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/unsubscribe?status=error", request.url)
    );
  }
}
