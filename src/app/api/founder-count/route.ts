import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const FOUNDER_LIMIT = 1000;

/**
 * GET /api/founder-count
 * Returns how many of the 1,000 Founder spots have been claimed (verified users).
 * Public, cached for 60 s to avoid hammering the DB on every page load.
 */
export async function GET() {
  try {
    const claimed = await prisma.user.count({
      where: { isBot: false, emailVerified: { not: null } },
    });
    return NextResponse.json(
      { claimed: Math.min(claimed, FOUNDER_LIMIT), remaining: Math.max(0, FOUNDER_LIMIT - claimed), limit: FOUNDER_LIMIT },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" } }
    );
  } catch {
    return NextResponse.json({ claimed: 0, remaining: FOUNDER_LIMIT, limit: FOUNDER_LIMIT });
  }
}
