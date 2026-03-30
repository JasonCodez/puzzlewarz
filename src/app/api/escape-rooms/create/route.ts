import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminUser } from '@/lib/requireAdmin';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await req.json();
    // Required fields: puzzleId, roomTitle, roomDescription
    const { puzzleId, roomTitle, roomDescription, timeLimitSeconds } = data;
    if (!puzzleId || !roomTitle || !roomDescription) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const createData: any = {
      puzzleId,
      roomTitle,
      roomDescription,
      minTeamSize: (typeof data.minTeamSize === 'number' && data.minTeamSize > 0) ? data.minTeamSize : 1,
      maxTeamSize: (typeof data.maxTeamSize === 'number' && data.maxTeamSize > 0) ? data.maxTeamSize : 8,
    };
    if (typeof timeLimitSeconds !== 'undefined' && timeLimitSeconds !== null) createData.timeLimitSeconds = Number(timeLimitSeconds);

    const escapeRoom = await prisma.escapeRoomPuzzle.create({
      data: createData,
    });
    return NextResponse.json({ escapeRoom }, { status: 201 });
  } catch (error) {
    console.error('[ESCAPE ROOM CREATE] Failed to create escape room', error);
    return NextResponse.json({ error: 'Failed to create escape room' }, { status: 500 });
  }
}
