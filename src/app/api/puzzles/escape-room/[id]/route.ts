import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const resolved = params instanceof Promise ? await params : params;
    const puzzleId = resolved.id;

    const escapeRoom = await prisma.escapeRoomPuzzle.findUnique({
      where: { puzzleId },
      include: {
        stages: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            title: true,
            description: true,
            puzzleType: true,
            puzzleData: true,
            hints: true,
            rewardItem: true,
            rewardDescription: true,
          },
        },
        layouts: {
          include: {
            hotspots: true,
          },
        },
      },
    });

    if (!escapeRoom) return NextResponse.json({ error: "Escape room not found" }, { status: 404 });

    return NextResponse.json({ id: escapeRoom.id, stages: escapeRoom.stages, puzzle: { title: escapeRoom.roomTitle, description: escapeRoom.roomDescription }, layouts: escapeRoom.layouts });
  } catch (e) {
    console.error('Error fetching escape room:', e);
    return NextResponse.json({ error: 'Failed to load escape room' }, { status: 500 });
  }
}
