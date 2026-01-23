import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Use the real NextAuth server session; remove dev-header shortcut.
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, image: true },
    });

    if (!user) {
      // Create a lightweight user record if NextAuth session exists but no
      // Prisma user row is present yet. This avoids 404s for fresh sign-ins
      // during local development and keeps behavior idempotent.
      const created = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || undefined,
          image: session.user.image || undefined,
          role: 'PLAYER',
        },
        select: { id: true, role: true, image: true },
      });

      return NextResponse.json({ id: created.id, role: created.role, image: created.image });
    }

    return NextResponse.json({ id: user.id, role: user.role, image: user.image });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
}
