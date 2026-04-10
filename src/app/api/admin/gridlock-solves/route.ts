import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/gridlock-solves
// Returns recent GridlockSolve records plus per-puzzle summary for admin view.
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });
    if (admin?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [recentSolves, puzzleSummaries] = await Promise.all([
      // Latest 50 real solves with puzzle title and user name
      prisma.gridlockSolve.findMany({
        orderBy: { solvedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          rank: true,
          elapsedSeconds: true,
          submissionCount: true,
          solvedAt: true,
          userId: true,
          puzzle: { select: { id: true, title: true } },
          user: { select: { name: true, email: true } },
        },
      }),

      // Per-puzzle breakdown: total solves, rank distribution, avg time
      prisma.gridlockSolve.groupBy({
        by: ['puzzleId', 'rank'],
        _count: { rank: true },
        _avg: { elapsedSeconds: true, submissionCount: true },
        orderBy: { puzzleId: 'asc' },
      }),
    ]);

    // Collect all puzzleIds from summaries to fetch titles
    const puzzleIds = [...new Set(puzzleSummaries.map(s => s.puzzleId))];
    const puzzles = await prisma.puzzle.findMany({
      where: { id: { in: puzzleIds } },
      select: { id: true, title: true },
    });
    const puzzleMap = Object.fromEntries(puzzles.map(p => [p.id, p.title]));

    // Collapse groupBy rows into per-puzzle objects
    type PuzzleRow = {
      puzzleId: string;
      title: string;
      totalSolves: number;
      avgSeconds: number;
      avgAttempts: number;
      rankBreakdown: Record<string, number>;
    };
    const byPuzzle: Record<string, PuzzleRow> = {};
    for (const row of puzzleSummaries) {
      if (!byPuzzle[row.puzzleId]) {
        byPuzzle[row.puzzleId] = {
          puzzleId: row.puzzleId,
          title: puzzleMap[row.puzzleId] ?? row.puzzleId,
          totalSolves: 0,
          avgSeconds: 0,
          avgAttempts: 0,
          rankBreakdown: {},
        };
      }
      const entry = byPuzzle[row.puzzleId];
      const count = row._count.rank;
      entry.totalSolves += count;
      entry.rankBreakdown[row.rank] = count;
      entry.avgSeconds =
        (entry.avgSeconds * (entry.totalSolves - count) + (row._avg.elapsedSeconds ?? 0) * count) /
        entry.totalSolves;
      entry.avgAttempts =
        (entry.avgAttempts * (entry.totalSolves - count) + (row._avg.submissionCount ?? 1) * count) /
        entry.totalSolves;
    }

    return NextResponse.json({
      recentSolves: recentSolves.map(s => ({
        id: s.id,
        puzzleId: s.puzzle.id,
        puzzleTitle: s.puzzle.title,
        rank: s.rank,
        elapsedSeconds: s.elapsedSeconds,
        submissionCount: s.submissionCount,
        solvedAt: s.solvedAt,
        isGuest: s.userId === null,
        userName: s.user?.name ?? s.user?.email ?? null,
      })),
      puzzleSummaries: Object.values(byPuzzle).sort((a, b) => b.totalSolves - a.totalSolves),
    });
  } catch (e) {
    console.error('[admin/gridlock-solves]', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
