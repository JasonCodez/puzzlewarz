import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
