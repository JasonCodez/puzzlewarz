import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getGridlockFileData, sanitizeGridlockForClient } from '@/lib/gridlockFile';

// Force dynamic — never cache this route. The puzzle changes at midnight every day.
export const dynamic = 'force-dynamic';

// GET /api/gridlock/daily
// Public — no auth required.
// Returns today's active gridlock_file puzzle.
// Selection logic:
//   1. Prefer any puzzle with a PuzzleSchedule.releaseAt <= now, picking the most recent one.
//   2. Fall back to the most recently created active puzzle (for puzzles with no schedule set).
export async function GET() {
  try {
    const now = new Date();

    // Look for a scheduled puzzle whose go-live date has passed
    let puzzle = await prisma.puzzle.findFirst({
      where: {
        puzzleType: 'gridlock_file',
        isActive: true,
        schedule: { releaseAt: { lte: now } },
      },
      select: { id: true, data: true },
      orderBy: { schedule: { releaseAt: 'desc' } },
    });

    // Fall back: puzzle with no schedule record at all
    if (!puzzle) {
      puzzle = await prisma.puzzle.findFirst({
        where: {
          puzzleType: 'gridlock_file',
          isActive: true,
          schedule: null,
        },
        select: { id: true, data: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!puzzle) {
      return NextResponse.json({ puzzle: null });
    }

    const fileData = getGridlockFileData(puzzle.data);
    if (!fileData) {
      return NextResponse.json({ puzzle: null });
    }

    // Count solves for this puzzle today (midnight UTC → now) for social proof.
    // SOCIAL_PROOF_BASELINE: added so the counter reads convincingly on day 1.
    const SOCIAL_PROOF_BASELINE = 653;
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const realSolvedToday = await prisma.gridlockSolve.count({
      where: { puzzleId: puzzle.id, solvedAt: { gte: todayStart } },
    });
    const solvedToday = realSolvedToday + SOCIAL_PROOF_BASELINE;

    // Calculate seconds until next UTC midnight so the browser revalidates at the right time
    const nextMidnight = new Date(todayStart);
    nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
    const secondsUntilMidnight = Math.max(1, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));

    return NextResponse.json(
      {
        puzzleId: puzzle.id,
        puzzle: sanitizeGridlockForClient(fileData),
        solvedToday,
      },
      {
        headers: {
          'Cache-Control': `public, max-age=${secondsUntilMidnight}, stale-while-revalidate=60`,
        },
      }
    );
  } catch (e) {
    console.error('[gridlock/daily]', e);
    return NextResponse.json({ puzzle: null });
  }
}
