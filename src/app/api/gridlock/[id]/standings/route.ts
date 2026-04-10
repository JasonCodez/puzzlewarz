import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { GridlockRank } from '@/lib/gridlockFile';

export const dynamic = 'force-dynamic';

// GET /api/gridlock/[id]/standings?rank=S&elapsedSeconds=45
// Public — returns tier distribution and the requesting player's percentile.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: puzzleId } = await params;
    const { searchParams } = new URL(req.url);
    const playerRank = (searchParams.get('rank') ?? '') as GridlockRank;
    const playerSeconds = parseInt(searchParams.get('elapsedSeconds') ?? '0', 10);

    // Aggregate solve counts per rank for this puzzle
    const groups = await prisma.gridlockSolve.groupBy({
      by: ['rank'],
      where: { puzzleId },
      _count: { rank: true },
    });

    const RANK_ORDER: GridlockRank[] = ['S', 'A', 'B', 'C', 'F'];
    const rankIndex = Object.fromEntries(RANK_ORDER.map((r, i) => [r, i]));

    // Build tier map with counts
    const tierCounts: Record<GridlockRank, number> = { S: 0, A: 0, B: 0, C: 0, F: 0 };
    for (const g of groups) {
      const r = g.rank as GridlockRank;
      if (r in tierCounts) tierCounts[r] = g._count.rank;
    }

    const totalSolves = Object.values(tierCounts).reduce((a, b) => a + b, 0);

    // Percentile: how many solvers the player beats
    // "Beats" = solvers with a worse rank tier + solvers in same tier but slower
    let beaten = 0;

    if (totalSolves > 0 && playerRank in rankIndex) {
      const playerTierIndex = rankIndex[playerRank];

      // All solvers in worse tiers (higher index = worse rank)
      for (const rank of RANK_ORDER) {
        if (rankIndex[rank] > playerTierIndex) {
          beaten += tierCounts[rank];
        }
      }

      // Within same tier: count solvers who were slower
      if (playerSeconds > 0) {
        const slowerInSameTier = await prisma.gridlockSolve.count({
          where: {
            puzzleId,
            rank: playerRank,
            elapsedSeconds: { gt: playerSeconds },
          },
        });
        beaten += slowerInSameTier;
      }
    }

    const percentile =
      totalSolves > 0 ? Math.round((beaten / totalSolves) * 100) : null;

    return NextResponse.json({
      tierCounts,
      totalSolves,
      percentile,
    });
  } catch (e) {
    console.error('[gridlock/standings]', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
