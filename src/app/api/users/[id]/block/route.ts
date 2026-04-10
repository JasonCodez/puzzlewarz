import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: targetId } = await params;

  const [currentUser, targetUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { id: true } }),
  ]);

  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (currentUser.id === targetId) {
    return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
  }

  const existing = await prisma.userBlock.findUnique({
    where: { issuerId_targetId: { issuerId: currentUser.id, targetId } },
  });

  if (existing) {
    // Toggle off — unblock
    await prisma.userBlock.delete({ where: { id: existing.id } });
    return NextResponse.json({ blocked: false });
  }

  await prisma.userBlock.create({
    data: { issuerId: currentUser.id, targetId },
  });

  // Also remove any follow relationship in both directions when blocking
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: currentUser.id, followingId: targetId },
        { followerId: targetId, followingId: currentUser.id },
      ],
    },
  });

  return NextResponse.json({ blocked: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ blocked: false });
  }

  const { id: targetId } = await params;
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!currentUser) return NextResponse.json({ blocked: false });

  const block = await prisma.userBlock.findUnique({
    where: { issuerId_targetId: { issuerId: currentUser.id, targetId } },
  });

  return NextResponse.json({ blocked: !!block });
}
