import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateSameOrigin } from "@/lib/requestSecurity";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { marketingOptIn: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ marketingOptIn: user.marketingOptIn });
  } catch (error) {
    console.error("Failed to fetch marketing preference:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const marketingOptIn = body.marketingOptIn === true;

    await prisma.user.update({
      where: { email: session.user.email },
      data: { marketingOptIn },
    });

    return NextResponse.json({ marketingOptIn });
  } catch (error) {
    console.error("Failed to update marketing preference:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
