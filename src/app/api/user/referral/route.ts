import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function getReferralBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
  if (!configured || configured.includes("localhost") || configured.includes("127.0.0.1")) {
    return "https://puzzlewarz.com";
  }
  return configured.replace(/\/$/, "");
}

// GET /api/user/referral
// Returns (or creates) the user's referral invite code + stats.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Find or create the user's referral record
  let referral = await prisma.userReferral.findFirst({
    where: { referrerId: user.id, refereeId: null },
    select: { id: true, inviteCode: true },
  });

  if (!referral) {
    // Create a fresh invite code (8 hex chars)
    const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    referral = await prisma.userReferral.create({
      data: { referrerId: user.id, inviteCode },
      select: { id: true, inviteCode: true },
    });
  }

  // Count how many people signed up via this user's codes
  const signedUp = await prisma.userReferral.count({
    where: { referrerId: user.id, refereeId: { not: null } },
  });

  const baseUrl = getReferralBaseUrl();
  return NextResponse.json({
    inviteCode: referral.inviteCode,
    link: `${baseUrl}/invite/${referral.inviteCode}`,
    signedUp,
  });
}
