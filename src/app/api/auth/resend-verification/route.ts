import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { z } from "zod";
import { sendEmail, generateEmailVerificationEmail } from "@/lib/mail";

const ResendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email: rawEmail } = ResendSchema.parse(body);
    const email = rawEmail.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, emailVerified: true } });

    // Always respond 200-ish to avoid leaking which emails exist.
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const requireVerification = process.env.NODE_ENV === "production";
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
