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

    // Fetch faster/slower counts in the same tier up-front so we can derive
    // both tierRank and an accurate ghost fraction in one pass.
    let slowerInSameTier = 0;
    let fasterInSameTier = 0;
    if (playerTierIndex >= 0 && playerSeconds > 0) {
      [slowerInSameTier, fasterInSameTier] = await Promise.all([
        prisma.gridlockSolve.count({
          where: { puzzleId, rank: playerRank, solvedAt: { gte: todayStart }, elapsedSeconds: { gt: playerSeconds } },
        }),
        prisma.gridlockSolve.count({
          where: { puzzleId, rank: playerRank, solvedAt: { gte: todayStart }, elapsedSeconds: { lt: playerSeconds } },
        }),
      ]);
    }

    // tierRank: 1 = fastest in tier today
    const tierRank: number | null = (playerTierIndex >= 0 && playerSeconds > 0)
      ? fasterInSameTier + 1
      : null;

    // For ghost same-tier fraction: use the player's actual rank position so
    // that rank-1 beats ~100% of ghost same-tier solvers, last place beats ~0%.
    // Formula: (realCount - tierRank + 1) / realCount
    // Falls back to 50% when there is no timing data.
    const realTierCount = tierCounts[playerRank] ?? 0;
    const sameTierGhostFraction = (tierRank !== null && realTierCount > 0)
      ? (realTierCount - tierRank + 1) / realTierCount
      : 0.5;

    if (playerTierIndex >= 0) {
      // Baseline ghost solvers beaten — worse tiers
      for (const rank of RANK_ORDER) {
        if (rankIndex[rank] > playerTierIndex) {
          beaten += BASELINE_TIERS[rank];
        }
      }
      // Ghost solvers in same tier — fraction based on actual speed rank
      beaten += Math.floor(BASELINE_TIERS[playerRank] * sameTierGhostFraction);

      // Real solvers beaten — worse tiers
      for (const rank of RANK_ORDER) {
        if (rankIndex[rank] > playerTierIndex) {
          beaten += tierCounts[rank];
        }
      }

      // Real solvers in same tier but slower
      beaten += slowerInSameTier;
    }

    // Percentile is always calculated against the full blended pool
    const percentile = playerTierIndex >= 0
      ? Math.min(99, Math.round((beaten / totalSolves) * 100))
      : null;

    return NextResponse.json({
      tierCounts: blendedTierCounts,
      totalSolves,
      percentile,
      tierRank,
    });
  } catch (e) {
    console.error('[gridlock/standings]', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
