import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET: /api/team/lobby/chat?teamId=...&puzzleId=...&limit=50
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const teamId = url.searchParams.get('teamId');
    const puzzleId = url.searchParams.get('puzzleId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    if (!teamId || !puzzleId) return NextResponse.json({ error: 'teamId and puzzleId required' }, { status: 400 });

    const messages = await prisma.lobbyMessage.findMany({
      where: { teamId, puzzleId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('lobby chat GET error', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST: create a message { teamId, puzzleId, content }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { teamId, puzzleId, content } = body;
    if (!teamId || !puzzleId || !content) return NextResponse.json({ error: 'teamId, puzzleId and content required' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Optionally check membership: allow only team members
    const membership = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: user.id } } });
    if (!membership) return NextResponse.json({ error: 'Only team members may post in lobby chat' }, { status: 403 });

    const msg = await prisma.lobbyMessage.create({ data: { teamId, puzzleId, userId: user.id, content } });
    const created = await prisma.lobbyMessage.findUnique({ where: { id: msg.id }, include: { user: { select: { id: true, name: true, email: true } } } });

    return NextResponse.json({ message: created }, { status: 201 });
  } catch (err) {
    console.error('lobby chat POST error', err);
    return NextResponse.json({ error: 'Failed to post message' }, { status: 500 });
  }
}

// DELETE: admin delete { messageId }
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { messageId } = body;
    if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Verify admin/moderator on the message's team
    const existing = await prisma.lobbyMessage.findUnique({ where: { id: messageId } });
    if (!existing) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    const membership = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: existing.teamId, userId: user.id } } });
    if (!membership || !["admin", "moderator"].includes(membership.role)) {
      return NextResponse.json({ error: 'Only team admins/moderators may delete messages' }, { status: 403 });
    }

    await prisma.lobbyMessage.delete({ where: { id: messageId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('lobby chat DELETE error', err);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
