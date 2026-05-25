import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Verify a Bearer token against CRON_SECRET. Returns a 401/500 response on
 * failure, or null on success.
 *
 * - Hard-fails if CRON_SECRET is not configured (no implicit "public" mode).
 * - Uses constant-time comparison to avoid timing oracles.
 */
export function requireCronAuth(request: NextRequest | Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length === 0) {
    return NextResponse.json(
      { error: "Server misconfigured: CRON_SECRET is required" },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  const expected = Buffer.from(secret, "utf8");
  const provided = Buffer.from(token, "utf8");

  if (provided.length !== expected.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
