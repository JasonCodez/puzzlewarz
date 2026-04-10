import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getGridlockFileData, sanitizeGridlockForClient } from '@/lib/gridlockFile';

// GET /api/gridlock/daily
// Public — no auth required.
// Returns today's active gridlock_file puzzle (most recently created active one).
export async function GET() {
  try {
    const puzzle = await prisma.puzzle.findFirst({
      where: { puzzleType: 'gridlock_file', isActive: true },
      select: { id: true, data: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!puzzle) {
      return NextResponse.json({ puzzle: null });
    }

    const fileData = getGridlockFileData(puzzle.data);
    if (!fileData) {
      return NextResponse.json({ puzzle: null });
    }

    // Count solves for this puzzle today (midnight UTC → now) for social proof
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const solvedToday = await prisma.gridlockSolve.count({
      where: { puzzleId: puzzle.id, solvedAt: { gte: todayStart } },
    });

    return NextResponse.json({
      puzzleId: puzzle.id,
      puzzle: sanitizeGridlockForClient(fileData),
      solvedToday,
    });
  } catch (e) {
    console.error('[gridlock/daily]', e);
    return NextResponse.json({ puzzle: null });
  }
}
