import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const FLAIR_EMOJI: Record<string, string> = {
  crown: "👑",
  fire: "🔥",
  lightning: "⚡",
  warz_legend: "⚔️🏆",
};

function resolveFlair(value: string | null | undefined): string {
  if (!value || value === "none") return "none";
  return FLAIR_EMOJI[value] ?? value;
}

/**
 * GET /api/leaderboards/period?type=weekly|monthly
 *
 * Returns the current weekly or monthly leaderboard ranked by points earned
 * from correct puzzle submissions within the current period window.
 * Also returns the active period's endsAt for countdown display.
 * If the period has been settled, returns the settled snapshot rewards
 * instead so the previous winners are still visible.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") === "monthly" ? "monthly" : "weekly";

    const now = new Date();

    // Compute the window boundaries for the current period
    let windowStart: Date;
    let windowEnd: Date;

    if (type === "weekly") {
      // Monday 00:00 UTC → following Sunday 23:59:59 UTC
      const day = now.getUTCDay(); // 0=Sun … 6=Sat
      const daysFromMonday = (day + 6) % 7;
      windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday));
      windowEnd = new Date(windowStart.getTime() + 7 * 86_400_000 - 1);
    } else {
      // 1st of month 00:00 UTC → last day 23:59:59 UTC
      windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      windowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1);
    }

    // Find or describe the active period (may not exist yet — first run)
    const activePeriod = await prisma.leaderboardPeriod.findFirst({
      where: { type, startsAt: { lte: now }, endsAt: { gte: now }, settledAt: null },
    });

    // Aggregate points earned per user within the period window
    // "Earned points" = correct puzzle submissions in the window
    // We group PuzzleSubmission records and sum the xp/points from UserPuzzleProgress
    // Simpler: count correct submissions, join with user data, weight by pointsEarned
    const rawRows = await prisma.userPuzzleProgress.groupBy({
      by: ["userId"],
      where: {
        solved: true,
        solvedAt: { gte: windowStart, lte: windowEnd },
        user: { isHidden: false, isBot: false, role: { not: "admin" } },
      },
      _sum: { pointsEarned: true },
      _count: { puzzleId: true },
    });

    if (rawRows.length === 0) {
      return NextResponse.json({
        entries: [],
        userRank: null,
        endsAt: windowEnd.toISOString(),
        periodId: activePeriod?.id ?? null,
        rewardTiers: rewardTiers(type),
      });
    }

    const userIds = rawRows.map((r) => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, isHidden: false, role: { not: "admin" } },
      select: { id: true, name: true, image: true, activeFlair: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Batch-fetch premium season pass holders
    const premiumPasses = await prisma.userSeasonPass.findMany({
      where: { userId: { in: userIds }, isPremium: true },
      select: { userId: true },
    });
    const premiumIds = new Set(premiumPasses.map((p) => p.userId));

    const entries = rawRows
      .map((row) => {
        const u = userMap.get(row.userId);
        if (!u) return null;
        return {
          userId: u.id,
          userName: u.name,
          userImage: u.image,
          activeFlair: resolveFlair(u.activeFlair),
          isPremium: premiumIds.has(u.id),
          periodPoints: row._sum.pointsEarned ?? 0,
          puzzlesSolved: row._count.puzzleId,
          rank: 0,
        };
      })
      .filter(Boolean) as {
        userId: string;
        userName: string | null;
        userImage: string | null;
        activeFlair: string;
        isPremium: boolean;
        periodPoints: number;
        puzzlesSolved: number;
        rank: number;
      }[];

    entries.sort((a, b) => b.periodPoints - a.periodPoints);
    entries.forEach((e, i) => { e.rank = i + 1; });

    const userRank = entries.find((e) => e.userId === currentUser.id) ?? null;

    return NextResponse.json({
      entries: entries.slice(0, 100),
      userRank,
      endsAt: windowEnd.toISOString(),
      periodId: activePeriod?.id ?? null,
      rewardTiers: rewardTiers(type),
    });
  } catch (error) {
    console.error("[leaderboards/period] Error:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}

/** Reward structure shown in the UI */
function rewardTiers(type: "weekly" | "monthly") {
  if (type === "weekly") {
    return [
      { rank: 1,        points: 2000, xp: 500  },
      { rank: 2,        points: 1500, xp: 350  },
      { rank: 3,        points: 1000, xp: 250  },
      { rank: "4-10",   points: 500,  xp: 150  },
      { rank: "11-25",  points: 250,  xp: 75   },
      { rank: "26-50",  points: 100,  xp: 25   },
    ];
  }
  return [
    { rank: 1,        points: 10000, xp: 2500 },
    { rank: 2,        points: 7500,  xp: 1750 },
    { rank: 3,        points: 5000,  xp: 1250 },
    { rank: "4-10",   points: 2500,  xp: 750  },
    { rank: "11-25",  points: 1000,  xp: 300  },
    { rank: "26-50",  points: 500,   xp: 100  },
  ];
}
