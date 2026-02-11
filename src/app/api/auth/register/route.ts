import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";
import { sendEmail, generateEmailVerificationEmail } from "@/lib/mail";

const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  referralCode: z.string().optional(), // Referral code from invite link
});

type RegisterInput = z.infer<typeof RegisterSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.parse(body);
    const name = parsed.name.trim();
    const email = parsed.email.trim().toLowerCase();
    const { password, referralCode } = parsed;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const requireVerification =
      process.env.NODE_ENV === "production" ||
      process.env.REQUIRE_EMAIL_VERIFICATION === "true";

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        // In non-production, keep dev flow simple if SMTP isn't configured.
        ...(requireVerification ? {} : { emailVerified: new Date() }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    // Send verification email in production (token stored in verification_tokens)
    let verificationSent = false;
    if (requireVerification) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Replace any old tokens for this email
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      await prisma.verificationToken.create({
        data: { identifier: email, token, expires },
      });

      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const verifyUrl = `${baseUrl}/auth/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
      const html = generateEmailVerificationEmail(name || email, verifyUrl);
      verificationSent = await sendEmail({
        to: email,
        subject: 'Verify your email for Puzzle Warz',
        html,
        text: `Verify your email: ${verifyUrl}`,
      });

      // If email couldn't be sent in production, roll back user creation so they aren't stuck.
      if (!verificationSent) {
        await prisma.verificationToken.deleteMany({ where: { identifier: email } });
        await prisma.user.delete({ where: { id: user.id } });
        return NextResponse.json(
          { error: 'Email verification is temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
    }

    // Handle referral if code provided
    if (referralCode) {
      try {
        // Find the referral by code
        const referral = await prisma.userReferral.findUnique({
          where: { inviteCode: referralCode },
        });

        if (referral && !referral.refereeId) {
          // Link the new user to the referral
          await prisma.userReferral.update({
            where: { id: referral.id },
            data: {
              refereeId: user.id,
              refereeJoinedAt: new Date(),
            },
          });
        }
      } catch (err) {
        console.error("Error processing referral code:", err);
        // Don't fail registration if referral processing fails
      }
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      verificationSent,
      requireVerification,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
