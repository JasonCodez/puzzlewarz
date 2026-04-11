import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/user/referral/lookup?code=XXXXXXXX
 * Public endpoint — returns the referrer's display name for the invite landing page.
 * No auth required; only exposes the name, not email or any sensitive data.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const referral = await prisma.userReferral.findFirst({
    where: { inviteCode: code.toUpperCase() },
    select: {
      referrer: { select: { name: true } },
    },
  });

  if (!referral) {
    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  }

  return NextResponse.json({ name: referral.referrer?.name ?? null });
}
