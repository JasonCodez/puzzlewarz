import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const VALID_REASONS = ["spam", "harassment", "hate_speech", "impersonation", "cheating", "other"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: targetId } = await params;

  const body = await request.json();
  const reason: string = body.reason ?? "";
  const details: string = (body.details ?? "").trim().slice(0, 1000);

  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  const [currentUser, targetUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { id: true } }),
  ]);

  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (currentUser.id === targetId) {
    return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 });
  }

  await prisma.userReport.create({
    data: {
      issuerId: currentUser.id,
      targetId,
      reason,
      details: details || null,
    },
  });

  return NextResponse.json({ reported: true });
}
