import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { enforceRateLimit, validateSameOrigin } from "@/lib/requestSecurity";

export async function DELETE(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await enforceRateLimit({
      key: `user:delete-account:${email}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
      message: "Too many deletion attempts. Please wait before trying again.",
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json().catch(() => ({}));
    const confirmationText =
      typeof body.confirmationText === "string" ? body.confirmationText.trim().toUpperCase() : "";
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";

    if (confirmationText !== "DELETE") {
      return NextResponse.json(
        { error: "Type DELETE to confirm account deletion." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.password) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to delete this account." },
          { status: 400 }
        );
      }

      const passwordValid = await bcrypt.compare(currentPassword, user.password);
      if (!passwordValid) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.verificationToken.deleteMany({ where: { identifier: email } });
      await tx.user.delete({ where: { id: user.id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return NextResponse.json(
          { error: "Unable to delete this account right now due to linked records." },
          { status: 409 }
        );
      }

      if (error.code === "P2025") {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    console.error("Failed to delete account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
