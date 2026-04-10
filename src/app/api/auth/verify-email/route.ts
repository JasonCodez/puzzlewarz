import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { enforceRateLimit, getClientAddress } from "@/lib/requestSecurity";

const VerifySchema = z.object({
  email: z.string().email(),
  token: z.string().min(10),
});

export async function POST(request: NextRequest) {
  try {
    const ipRateLimit = await enforceRateLimit({
      key: `auth:verify-email:ip:${getClientAddress(request)}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
      message: "Too many verification attempts. Please try again later.",
    });
    if (ipRateLimit) {
      return ipRateLimit;
    }

    const body = await request.json();
    const { email: rawEmail, token } = VerifySchema.parse(body);
    const email = rawEmail.trim().toLowerCase();

    const emailRateLimit = await enforceRateLimit({
      key: `auth:verify-email:email:${email}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
      message: "Too many verification attempts for this email. Please try again later.",
    });
    if (emailRateLimit) {
      return emailRateLimit;
    }

    const record = await prisma.verificationToken.findFirst({
      where: { identifier: email, token },
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
    }

    if (record.expires.getTime() < Date.now()) {
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const wasAlreadyVerified = !!user.emailVerified;

    if (!wasAlreadyVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    // Award 100 points to the referrer — only once, only after email is confirmed
    if (!wasAlreadyVerified) {
      try {
        const referral = await prisma.userReferral.findFirst({
          where: { refereeId: user.id, referralRewardedAt: null },
        });
        if (referral) {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: referral.referrerId },
              data: { totalPoints: { increment: 100 } },
            }),
            prisma.userReferral.update({
              where: { id: referral.id },
              data: { referralRewardedAt: new Date() },
            }),
          ]);
        }
      } catch (err) {
        // Non-fatal — don't block verification if reward fails
        console.error("[verify-email] Failed to award referral points:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("verify-email failed:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
