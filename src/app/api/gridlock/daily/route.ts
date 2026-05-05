import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getGridlockFileData, sanitizeGridlockForClient } from '@/lib/gridlockFile';

// Force dynamic — never cache this route. The puzzle changes at midnight every day.
export const dynamic = 'force-dynamic';

// GET /api/gridlock/daily
// Public — no auth required.
// Returns today's scheduled gridlock_file puzzle.
// Selection logic:
//   1. Only consider puzzles with a PuzzleSchedule.releaseAt <= now.
//   2. Pick the most recently scheduled candidate.
// Unscheduled gridlock_file puzzles belong to the normal catalog and are excluded here.
export async function GET() {
  try {
    const now = new Date();

    // Look for scheduled puzzles whose go-live date has passed.
    // We fetch ALL candidates and sort in JS to avoid relying on Prisma
    // orderBy-on-relation, which can silently fall back to natural row order
    // and always return the first-created puzzle.
    const candidates = await prisma.puzzle.findMany({
      where: {
        puzzleType: 'gridlock_file',
        isActive: true,
        schedule: { releaseAt: { lte: now } },
      },
      select: { id: true, data: true, schedule: { select: { releaseAt: true } } },
    });

    // Sort descending by releaseAt — most recently scheduled = current puzzle
    candidates.sort((a, b) => {
      const aT = (a.schedule?.releaseAt ?? new Date(0)).getTime();
      const bT = (b.schedule?.releaseAt ?? new Date(0)).getTime();
      return bT - aT;
    });

    const puzzle: { id: string; data: unknown } | null = candidates[0] ?? null;

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
          'Cache-Control': `private, max-age=${secondsUntilMidnight}, stale-while-revalidate=60`,
        },
      }
    );
  } catch (e) {
    console.error('[gridlock/daily]', e);
    return NextResponse.json({ puzzle: null });
  }
}
