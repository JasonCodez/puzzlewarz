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

    const SOCIAL_PROOF_BASELINE = 653;
    // Distribute baseline across tiers at a realistic proportion (sums to 653).
    // These represent the "ghost" solvers that inflate the counter for social proof.
    const BASELINE_TIERS: Record<GridlockRank, number> = { S: 52, A: 144, B: 229, C: 163, F: 65 };
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // Aggregate solve counts per rank — today only (matches the "cracked today" counter)
    const groups = await prisma.gridlockSolve.groupBy({
      by: ['rank'],
      where: { puzzleId, solvedAt: { gte: todayStart } },
      _count: { rank: true },
    });

    const RANK_ORDER: GridlockRank[] = ['S', 'A', 'B', 'C', 'F'];
    const rankIndex = Object.fromEntries(RANK_ORDER.map((r, i) => [r, i]));

    // Build tier map with real counts, then add baseline ghost solvers
    const tierCounts: Record<GridlockRank, number> = { S: 0, A: 0, B: 0, C: 0, F: 0 };
    for (const g of groups) {
      const r = g.rank as GridlockRank;
      if (r in tierCounts) tierCounts[r] = g._count.rank;
    }
    const realTotalSolves = Object.values(tierCounts).reduce((a, b) => a + b, 0);

    // Blended tier counts shown to the user (real + baseline)
    const blendedTierCounts: Record<GridlockRank, number> = {
      S: tierCounts.S + BASELINE_TIERS.S,
      A: tierCounts.A + BASELINE_TIERS.A,
      B: tierCounts.B + BASELINE_TIERS.B,
      C: tierCounts.C + BASELINE_TIERS.C,
      F: tierCounts.F + BASELINE_TIERS.F,
    };
    const totalSolves = realTotalSolves + SOCIAL_PROOF_BASELINE;

    // Percentile: how many solvers the player beats
    // "Beats" = solvers with a worse rank tier + solvers in same tier but slower
    let beaten = 0;

    const playerTierIndex = playerRank in rankIndex ? rankIndex[playerRank] : -1;

    if (playerTierIndex >= 0) {
      // Baseline solvers beaten (ghost pool — worse or same tier but "slower")
      for (const rank of RANK_ORDER) {
        if (rankIndex[rank] > playerTierIndex) {
          beaten += BASELINE_TIERS[rank];
        }
      }
      // Partial credit within same baseline tier: assume median speed (50%)
      beaten += Math.floor(BASELINE_TIERS[playerRank] * 0.5);

      // Real solvers beaten — worse tiers
      for (const rank of RANK_ORDER) {
        if (rankIndex[rank] > playerTierIndex) {
          beaten += tierCounts[rank];
        }
      }

      // Real solvers in same tier but slower
      if (playerSeconds > 0) {
        const slowerInSameTier = await prisma.gridlockSolve.count({
          where: {
            puzzleId,
            rank: playerRank,
            solvedAt: { gte: todayStart },
            elapsedSeconds: { gt: playerSeconds },
          },
        });
        beaten += slowerInSameTier;
      }
    }

    // Percentile is always calculated against the full blended pool
    const percentile = playerTierIndex >= 0
      ? Math.min(99, Math.round((beaten / totalSolves) * 100))
      : null;

    return NextResponse.json({
      tierCounts: blendedTierCounts,
      totalSolves,
      percentile,
    });
  } catch (e) {
    console.error('[gridlock/standings]', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
