import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  aggregateTeamScoreFromMembershipWindow,
  indexProgressByUserId,
} from "@/lib/team-membership-scoring";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all teams with current members.
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        isPublic: true,
        members: {
          select: {
            userId: true,
            joinedAt: true,
            user: {
              select: {
                teamBannerColor: true,
              },
            },
          },
        },
      },
    });

    const allUserIds = Array.from(
      new Set(
        teams.flatMap((team) => team.members.map((member) => member.userId))
      )
    );

    const allProgress = allUserIds.length
      ? await prisma.userPuzzleProgress.findMany({
          where: {
            userId: { in: allUserIds },
            solved: true,
            solvedAt: { not: null },
          },
          select: {
            userId: true,
            pointsEarned: true,
            solvedAt: true,
          },
        })
      : [];

    const progressByUserId = indexProgressByUserId(allProgress);

    // Calculate team rankings
    const entries = teams.map(
      (team: { id: string; name?: string | null; isPublic: boolean; members: Array<{ userId: string; joinedAt: Date; user: { teamBannerColor: string | null } }> }) => {
        const members = team.members;
        const { totalPoints, totalSolved } = aggregateTeamScoreFromMembershipWindow(
          members,
          progressByUserId
        );

        // Use the first member's banner color as the team banner (or "none" if not set)
        const bannerColor = members.find((m) => m.user?.teamBannerColor && m.user.teamBannerColor !== "none")?.user?.teamBannerColor ?? "none";
        return {
          teamId: team.id,
          teamName: team.name,
          isPublic: team.isPublic,
          bannerColor,
          totalPoints,
          totalPuzzlesSolved: totalSolved,
          memberCount: members.length,
          rank: 0,
        };
      }
    );

    // Sort and rank — exclude disbanded teams (no members)
    const activeEntries = entries.filter((e) => e.memberCount > 0);
    activeEntries.sort((a, b) => b.totalPoints - a.totalPoints);
    activeEntries.forEach((entry: any, index: any) => {
      entry.rank = index + 1;
    });

    // Find user's team rank
    const userTeams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            user: { email: session.user.email },
          },
        },
      },
      select: { id: true },
    });

    let userTeamRank = null;
    if (userTeams.length > 0) {
      userTeamRank = activeEntries.find((e: { teamId: string }) => e.teamId === userTeams[0].id) || null;
    }

    return NextResponse.json(
      { entries: activeEntries, userTeamRank },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching team leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch team leaderboard" },
      { status: 500 }
    );
  }
}
