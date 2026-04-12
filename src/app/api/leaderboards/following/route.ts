import { NextResponse } from "next/server";
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
 * GET /api/leaderboards/following
 * Returns a ranked leaderboard of only the users the current user follows,
 * plus the current user themselves, sorted by earned points.
 */
export async function GET() {
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

    // Get all users this person follows
    const follows = await prisma.follow.findMany({
      where: { followerId: currentUser.id },
      select: { followingId: true },
    });

    const followingIds = follows.map((f) => f.followingId);
    // Always include the current user in their own "Following" leaderboard
    const relevantIds = [...new Set([currentUser.id, ...followingIds])];

    const users = await prisma.user.findMany({
      where: { id: { in: relevantIds }, isHidden: false },
      select: { id: true, name: true, image: true, totalPoints: true, purchasedPoints: true, activeFlair: true },
    });

    const entries = await Promise.all(
      users.map(async (user) => {
        const puzzlesSolved = await prisma.userPuzzleProgress.count({
          where: { userId: user.id, solved: true },
        });
        const earnedPoints = (user.totalPoints ?? 0) - (user.purchasedPoints ?? 0);
        return {
          userId: user.id,
          userName: user.name,
          userImage: user.image,
          activeFlair: resolveFlair(user.activeFlair),
          puzzlesSolved,
          totalPoints: earnedPoints,
          rank: 0,
          isCurrentUser: user.id === currentUser.id,
        };
      })
    );

    entries.sort((a, b) => b.totalPoints - a.totalPoints);
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    const userRank = entries.find((e) => e.isCurrentUser) ?? null;

    return NextResponse.json({ entries, userRank, followingCount: followingIds.length });
  } catch (error) {
    console.error("[leaderboards/following] error:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
