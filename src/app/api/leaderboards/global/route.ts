import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Map legacy word values to their emoji (for users who equipped before the fix)
const FLAIR_EMOJI: Record<string, string> = {
  crown: "👑",
  fire: "🔥",
  lightning: "⚡",
  warz_legend: "⚔️🏆",
};

function resolveFlair(value: string | null | undefined): string {
  if (!value || value === "none") return "none";
  return FLAIR_EMOJI[value] ?? value; // already an emoji → pass through
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all non-hidden, non-admin, non-bot users
    const users = await prisma.user.findMany({
      where: { isHidden: false, isBot: false, role: { not: "admin" } },
      select: { id: true, name: true, image: true, totalPoints: true, purchasedPoints: true, activeFlair: true },
    });

    const solvedCounts = users.length
      ? await prisma.userPuzzleProgress.groupBy({
          by: ["userId"],
          where: {
            userId: { in: users.map((u) => u.id) },
            solved: true,
          },
          _count: { _all: true },
        })
      : [];
    const solvedCountByUserId = new Map(solvedCounts.map((row) => [row.userId, row._count._all]));

    // Batch-fetch premium season pass holders
    const premiumPasses = await prisma.userSeasonPass.findMany({
      where: { userId: { in: users.map((u) => u.id) }, isPremium: true },
      select: { userId: true },
    });
    const premiumIds = new Set(premiumPasses.map((p) => p.userId));

    // earnedPoints = totalPoints - purchasedPoints so bought points never affect rank.
    // puzzlesSolved comes from solved progress records so spending points never lowers solve count.
    const entries = users.map((user) => {
      const earnedPoints = (user.totalPoints ?? 0) - (user.purchasedPoints ?? 0);
      const puzzlesSolved = solvedCountByUserId.get(user.id) ?? 0;
      return {
        userId: user.id,
        userName: user.name,
        userImage: user.image,
        activeFlair: resolveFlair(user.activeFlair),
        isPremium: premiumIds.has(user.id),
        puzzlesSolved,
        totalPoints: earnedPoints,
        rank: 0,
      };
    });

    // Sort by earned points descending
    entries.sort((a, b) => b.totalPoints - a.totalPoints);

    // Re-rank after sorting
    entries.forEach((entry: any, index: any) => {
      entry.rank = index + 1;
    });

    // Find user's rank by id (avoid revealing emails in API)
    const userRank = entries.find((e: { userId: string }) => e.userId === (session.user as any)?.id) || null;

    return NextResponse.json({
      entries: entries.slice(0, 100), // Top 100
      userRank: userRank || null,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
