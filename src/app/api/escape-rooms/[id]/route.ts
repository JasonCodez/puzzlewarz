import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop();
    const escapeRoom = await prisma.escapeRoomPuzzle.findUnique({
      where: { id },
      include: { puzzle: true },
    });
    if (!escapeRoom) {
      return NextResponse.json({ error: 'Escape room not found' }, { status: 404 });
    }
    return NextResponse.json({ escapeRoom });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ error: errorMessage, stack: errorStack }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop();
    const data = await req.json();

    // Escape rooms are team-only and always require exactly 4 players.
    // Whitelist allowed fields and enforce min/max team size.
    const updateData: any = {
      ...(typeof data?.puzzleId === 'string' ? { puzzleId: data.puzzleId } : {}),
      ...(typeof data?.roomTitle === 'string' ? { roomTitle: data.roomTitle } : {}),
      ...(typeof data?.roomDescription === 'string' ? { roomDescription: data.roomDescription } : {}),
      ...(typeof data?.timeLimitSeconds !== 'undefined' && data?.timeLimitSeconds !== null
        ? { timeLimitSeconds: Number(data.timeLimitSeconds) }
        : {}),
      minTeamSize: 4,
      maxTeamSize: 4,
    };

    const escapeRoom = await prisma.escapeRoomPuzzle.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({ escapeRoom });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ error: errorMessage, stack: errorStack }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop();
    await prisma.escapeRoomPuzzle.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ error: errorMessage, stack: errorStack }, { status: 500 });
  }
}
