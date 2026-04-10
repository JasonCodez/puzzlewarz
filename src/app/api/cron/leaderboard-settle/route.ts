import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/cron/leaderboard-settle?type=weekly|monthly
 *
 * Settles the current weekly or monthly leaderboard:
 *   1. Determines the period window that just ended
 *   2. Ranks users by points earned in that window
 *   3. Awards bonus points + XP to the top 50
 *   4. Records a LeaderboardPeriod + LeaderboardReward rows
 *
 * Protected by CRON_SECRET header — set this as an env var and pass it
 * as the Authorization: Bearer <secret> header from your scheduler.
 *
 * Render cron job example (in render.yaml):
 *   - type: cron
 *     schedule: "0 0 * * 1"   # weekly → every Monday 00:00 UTC
 *     command: >
 *       curl -X POST https://your-app.onrender.com/api/cron/leaderboard-settle?type=weekly
 *            -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") === "monthly" ? "monthly" : "weekly";

  const now = new Date();

  // The period that just ended — look back one period from now
  let windowStart: Date;
  let windowEnd: Date;

  if (type === "weekly") {
    // Last Monday 00:00 UTC → last Sunday 23:59:59 UTC
    const day = now.getUTCDay();
    const daysFromMonday = (day + 6) % 7;
    const thisMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday));
    windowEnd = new Date(thisMonday.getTime() - 1);           // end of last Sunday 23:59:59
    windowStart = new Date(thisMonday.getTime() - 7 * 86_400_000); // last Monday 00:00
  } else {
    // First day of last month → last day of last month 23:59:59
    const y = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
    const m = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
    windowStart = new Date(Date.UTC(y, m, 1));
    windowEnd = new Date(Date.UTC(y, m + 1, 1) - 1);
  }

  // Idempotency: skip if already settled for this exact window
  const existing = await prisma.leaderboardPeriod.findFirst({
    where: { type, startsAt: windowStart, settledAt: { not: null } },
  });
  if (existing) {
    return NextResponse.json({ message: "Already settled", periodId: existing.id });
  }

  // Rank users by points earned this period
  const rawRows = await prisma.userPuzzleProgress.groupBy({
    by: ["userId"],
    where: {
      solved: true,
      solvedAt: { gte: windowStart, lte: windowEnd },
    },
    _sum: { pointsEarned: true },
    orderBy: { _sum: { pointsEarned: "desc" } },
    take: 50,
  });

  if (rawRows.length === 0) {
    // Nothing to settle — record an empty period anyway
    await prisma.leaderboardPeriod.create({
      data: { type, startsAt: windowStart, endsAt: windowEnd, settledAt: now },
    });
    return NextResponse.json({ message: "No participants — period recorded with no rewards", type, windowStart, windowEnd });
  }

  // Map rank → reward
  const rewardForRank = (rank: number, t: "weekly" | "monthly") => {
    const tiers = t === "weekly"
      ? [
          { max: 1,  points: 2000, xp: 500  },
          { max: 2,  points: 1500, xp: 350  },
          { max: 3,  points: 1000, xp: 250  },
          { max: 10, points: 500,  xp: 150  },
          { max: 25, points: 250,  xp: 75   },
          { max: 50, points: 100,  xp: 25   },
        ]
      : [
          { max: 1,  points: 10000, xp: 2500 },
          { max: 2,  points: 7500,  xp: 1750 },
          { max: 3,  points: 5000,  xp: 1250 },
          { max: 10, points: 2500,  xp: 750  },
          { max: 25, points: 1000,  xp: 300  },
          { max: 50, points: 500,   xp: 100  },
        ];
    for (const tier of tiers) {
      if (rank <= tier.max) return { points: tier.points, xp: tier.xp };
    }
    return null;
  };

  const period = await prisma.leaderboardPeriod.create({
    data: { type, startsAt: windowStart, endsAt: windowEnd, settledAt: now },
  });

  const rewarded: { userId: string; rank: number; points: number; xp: number }[] = [];

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < rawRows.length; i++) {
      const rank = i + 1;
      const row = rawRows[i];
      const reward = rewardForRank(rank, type);
      if (!reward) continue;

      await tx.leaderboardReward.create({
        data: {
          periodId: period.id,
          userId: row.userId,
          rank,
          points: reward.points,
          xp: reward.xp,
        },
      });

      await tx.user.update({
        where: { id: row.userId },
        data: {
          totalPoints: { increment: reward.points },
          xp: { increment: reward.xp },
        },
      });

      rewarded.push({ userId: row.userId, rank, ...reward });
    }
  });

  return NextResponse.json({
    message: "Settled",
    type,
    periodId: period.id,
    windowStart,
    windowEnd,
    rewarded,
  });
}
