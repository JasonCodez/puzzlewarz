import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { enforceRateLimit, getClientAddress } from "@/lib/requestSecurity";

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit({
      key: `auth:reset-password:ip:${getClientAddress(request)}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
      message: "Too many attempts. Please try again later.",
    });
    if (rateLimit) return rateLimit;

    const { token, password } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Find the token
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record || !record.identifier.startsWith("pwd-reset:")) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    // Check expiry
    if (record.expires < new Date()) {
      // Clean up expired token
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
    }

    const email = record.identifier.replace("pwd-reset:", "");

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    // Hash the new password and update
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the used token (and any other reset tokens for this email)
    await prisma.verificationToken.deleteMany({
      where: { identifier: `pwd-reset:${email}` },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "An error occurred. Please try again." }, { status: 500 });
  }
}
