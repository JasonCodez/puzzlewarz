import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Development helper: allow specifying a dev user via header
    // `x-dev-user` so we can exercise authenticated routes without
    // performing a full NextAuth sign-in flow during local testing.
    // Only enable the header when running in development.
    const devEmail = request.headers.get("x-dev-user");
    const allowDevHeader = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ENABLE_DEV_HEADER === "true";

    const session = devEmail && allowDevHeader
      ? ({ user: { email: devEmail } } as any)
      : await getServerSession(authOptions);

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
