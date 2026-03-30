import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { z } from "zod";
import { sendEmail, generateEmailVerificationEmail } from "@/lib/mail";
import { enforceRateLimit, getClientAddress } from "@/lib/requestSecurity";

const ResendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const ipRateLimit = await enforceRateLimit({
      key: `auth:resend-verification:ip:${getClientAddress(request)}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
      message: "Too many verification email requests. Please try again later.",
    });
    if (ipRateLimit) {
      return ipRateLimit;
    }

    const body = await request.json();
    const { email: rawEmail } = ResendSchema.parse(body);
    const email = rawEmail.trim().toLowerCase();

    const emailRateLimit = await enforceRateLimit({
      key: `auth:resend-verification:email:${email}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
      message: "Too many verification email requests for this address. Please try again later.",
    });
    if (emailRateLimit) {
      return emailRateLimit;
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, emailVerified: true } });

    // Always respond 200-ish to avoid leaking which emails exist.
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const requireVerification =
      process.env.NODE_ENV === "production" ||
      process.env.REQUIRE_EMAIL_VERIFICATION === "true";
    if (!requireVerification) {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
      return NextResponse.json({ ok: true, autoVerified: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({ data: { identifier: email, token, expires } });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/auth/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

    const html = generateEmailVerificationEmail(user.name || email, verifyUrl);
    const sent = await sendEmail({
      to: email,
      subject: "Verify your email for Puzzle Warz",
      html,
      text: `Verify your email: ${verifyUrl}`,
    });

    if (!sent) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("resend-verification failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
