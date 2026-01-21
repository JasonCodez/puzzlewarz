import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const resolved = params instanceof Promise ? await params : params;
    const puzzleId = resolved.id;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ inventory: [] });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ inventory: [] });

    const escapeRoom = await prisma.escapeRoomPuzzle.findUnique({ where: { puzzleId } });
    if (!escapeRoom) return NextResponse.json({ inventory: [] });

    const prs = await prisma.playerRoomState.findUnique({ where: { userId_escapeRoomId: { userId: user.id, escapeRoomId: escapeRoom.id } } }).catch(() => null);
    let stateObj: any = {};
    if (prs?.state) {
      try { stateObj = JSON.parse(prs.state); } catch (e) { stateObj = {}; }
    }

    return NextResponse.json({ inventory: stateObj.inventory || [] });
  } catch (e) {
    console.error('Failed to fetch player room state', e);
    return NextResponse.json({ inventory: [] });
  }
}
