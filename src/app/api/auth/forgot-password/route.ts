import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { sendEmail, generatePasswordResetEmail } from "@/lib/mail";
import { enforceRateLimit, getClientAddress } from "@/lib/requestSecurity";

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit({
      key: `auth:forgot-password:ip:${getClientAddress(request)}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
      message: "Too many password reset requests. Please try again later.",
    });
    if (rateLimit) return rateLimit;

    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      // Always return success to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true },
    });

    // Always return success regardless of whether user exists
    if (!user || !user.email) {
      return NextResponse.json({ success: true });
    }

    // Rate limit per email too
    const emailRateLimit = await enforceRateLimit({
      key: `auth:forgot-password:email:${normalizedEmail}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
      message: "Too many password reset requests for this email.",
    });
    if (emailRateLimit) {
      // Still return success to prevent enumeration
      return NextResponse.json({ success: true });
    }

    // Delete any existing password reset tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: `pwd-reset:${normalizedEmail}` },
    });

    // Create a new token (expires in 1 hour)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        identifier: `pwd-reset:${normalizedEmail}`,
        token,
        expires,
      },
    });

    // Send the reset email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Puzzle Warz password",
        html: generatePasswordResetEmail(user.name || "there", resetUrl),
      });
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: true });
  }
}
