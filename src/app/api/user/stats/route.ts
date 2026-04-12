import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, totalPoints: true, purchasedPoints: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get total puzzles solved
    const solvedCount = await prisma.userPuzzleProgress.count({
      where: { userId: user.id, solved: true },
    });

    // Get total points earned (from user record — includes puzzle + daily + other rewards)
    const earnedPoints = (user.totalPoints ?? 0) - (user.purchasedPoints ?? 0);

    // Get number of teams the user is in
    const teamCount = await prisma.teamMember.count({
      where: { userId: user.id },
    });

    // Get user's global rank (based on earned points, excluding purchased)
    const allUsers = await prisma.user.findMany({
      where: { isHidden: false, role: { not: "admin" } },
      select: { id: true, totalPoints: true, purchasedPoints: true },
    });
    const sorted = allUsers
      .map(u => ({ userId: u.id, earned: (u.totalPoints ?? 0) - (u.purchasedPoints ?? 0) }))
      .sort((a, b) => b.earned - a.earned);
    const userRank = sorted.findIndex(u => u.userId === user.id) + 1;

    return NextResponse.json({
      totalPuzzlesSolved: solvedCount,
      totalPoints: earnedPoints,
      currentTeams: teamCount,
      rank: userRank > 0 ? userRank : null,
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 }
    );
  }
}
