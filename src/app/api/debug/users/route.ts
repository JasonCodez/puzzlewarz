import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdmin";

export async function GET() {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: { id: true, name: true },
    });
    return NextResponse.json({ users, count: users.length });
  } catch (error) {
    console.error("[DEBUG USERS] Failed to fetch users", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
