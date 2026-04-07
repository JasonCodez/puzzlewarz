import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateSameOrigin } from "@/lib/requestSecurity";

export async function POST(request: NextRequest) {
  try {
    const originError = validateSameOrigin(request);
    if (originError) return originError;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, hintTokens: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.hintTokens < 1) {
      return NextResponse.json(
        { error: "No hint tokens available. Purchase them in the Store!" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { hintTokens: { decrement: 1 } },
      select: { hintTokens: true },
    });

    return NextResponse.json({ remainingTokens: updated.hintTokens });
  } catch (error) {
    console.error("Failed to consume hint token:", error);
    return NextResponse.json({ error: "Failed to consume hint token" }, { status: 500 });
  }
}
