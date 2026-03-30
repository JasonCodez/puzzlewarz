import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminUser } from '@/lib/requireAdmin';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
    console.error('[ESCAPE ROOM GET] Failed to fetch escape room', error);
    return NextResponse.json({ error: 'Failed to fetch escape room' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = req.nextUrl.pathname.split('/').pop();
    const data = await req.json();

    // Whitelist allowed fields. Only update minTeamSize/maxTeamSize if explicitly provided.
    const updateData: any = {
      ...(typeof data?.puzzleId === 'string' ? { puzzleId: data.puzzleId } : {}),
      ...(typeof data?.roomTitle === 'string' ? { roomTitle: data.roomTitle } : {}),
      ...(typeof data?.roomDescription === 'string' ? { roomDescription: data.roomDescription } : {}),
      ...(typeof data?.timeLimitSeconds !== 'undefined' && data?.timeLimitSeconds !== null
        ? { timeLimitSeconds: Number(data.timeLimitSeconds) }
        : {}),
      ...(typeof data?.minTeamSize === 'number' && data.minTeamSize > 0 ? { minTeamSize: data.minTeamSize } : {}),
      ...(typeof data?.maxTeamSize === 'number' && data.maxTeamSize > 0 ? { maxTeamSize: data.maxTeamSize } : {}),
    };

    const escapeRoom = await prisma.escapeRoomPuzzle.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({ escapeRoom });
  } catch (error) {
    console.error('[ESCAPE ROOM UPDATE] Failed to update escape room', error);
    return NextResponse.json({ error: 'Failed to update escape room' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = req.nextUrl.pathname.split('/').pop();
    await prisma.escapeRoomPuzzle.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ESCAPE ROOM DELETE] Failed to delete escape room', error);
    return NextResponse.json({ error: 'Failed to delete escape room' }, { status: 500 });
  }
}
