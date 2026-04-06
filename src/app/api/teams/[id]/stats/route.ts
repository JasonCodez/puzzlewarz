import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        isPublic: true,
        members: {
          select: {
            userId: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                totalPoints: true,
                purchasedPoints: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const memberIds = team.members.map((m) => m.userId);

    // Get puzzles solved by each member
    const memberProgress = await prisma.userPuzzleProgress.findMany({
      where: { userId: { in: memberIds }, solved: true },
      select: {
        userId: true,
        pointsEarned: true,
        solvedAt: true,
        puzzle: {
          select: {
            id: true,
            title: true,
            puzzleType: true,
            difficulty: true,
          },
        },
      },
    });

    // Build per-member stats
    const memberStats = team.members.map((m) => {
      const solved = memberProgress.filter((p) => p.userId === m.userId);
      const earnedPoints = (m.user.totalPoints ?? 0) - (m.user.purchasedPoints ?? 0);
      return {
        userId: m.userId,
        name: m.user.name,
        image: m.user.image,
        role: m.role,
        joinedAt: m.joinedAt,
        earnedPoints,
        puzzlesSolved: solved.length,
      };
    });

    // Sort by earned points descending for top contributors
    const topContributors = [...memberStats].sort((a, b) => b.earnedPoints - a.earnedPoints);

    // Total team stats
    const totalEarnedPoints = memberStats.reduce((sum, m) => sum + m.earnedPoints, 0);
    const totalPuzzlesSolved = memberProgress.length;
    const avgPointsPerMember = memberIds.length > 0 ? Math.round(totalEarnedPoints / memberIds.length) : 0;

    // Team rank — get all teams' earned points and find position
    const allTeams = await prisma.team.findMany({
      select: {
        id: true,
        members: {
          select: {
            user: {
              select: {
                totalPoints: true,
                purchasedPoints: true,
              },
            },
          },
        },
      },
    });

    const teamScores = allTeams
      .filter((t) => t.members.length > 0)
      .map((t) => ({
        teamId: t.id,
        totalEarned: t.members.reduce(
          (sum, m) => sum + ((m.user.totalPoints ?? 0) - (m.user.purchasedPoints ?? 0)),
          0
        ),
      }))
      .sort((a, b) => b.totalEarned - a.totalEarned);

    const rank = teamScores.findIndex((t) => t.teamId === teamId) + 1;
    const totalTeams = teamScores.length;

    // Recent activity — last 20 puzzles solved by team members
    const recentSolves = memberProgress
      .filter((p) => p.solvedAt)
      .sort((a, b) => new Date(b.solvedAt!).getTime() - new Date(a.solvedAt!).getTime())
      .slice(0, 20)
      .map((p) => {
        const member = team.members.find((m) => m.userId === p.userId);
        return {
          userName: member?.user.name ?? "Unknown",
          userImage: member?.user.image ?? null,
          puzzleTitle: p.puzzle.title,
          puzzleType: p.puzzle.puzzleType,
          difficulty: p.puzzle.difficulty,
          pointsEarned: p.pointsEarned,
          solvedAt: p.solvedAt,
        };
      });

    return NextResponse.json({
      rank,
      totalTeams,
      totalEarnedPoints,
      totalPuzzlesSolved,
      avgPointsPerMember,
      memberCount: memberIds.length,
      topContributors,
      recentActivity: recentSolves,
    });
  } catch (error) {
    console.error("Error fetching team stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch team stats" },
      { status: 500 }
    );
  }
}
