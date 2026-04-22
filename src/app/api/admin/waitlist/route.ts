import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const entries = await prisma.waitlistEmail.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, createdAt: true },
    });

    return NextResponse.json({ entries, total: entries.length });
  } catch (error) {
    console.error("[ADMIN WAITLIST GET]", error);
    return NextResponse.json({ error: "Failed to fetch waitlist" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await request.json() as { id: string };
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.waitlistEmail.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN WAITLIST DELETE]", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
