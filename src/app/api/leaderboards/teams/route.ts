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

    // Get all teams with their members and stats
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        isPublic: true,
      },
    });

    // Calculate team rankings
    const entries = await Promise.all(
      teams.map(async (team: { id: string; name?: string | null; isPublic: boolean }) => {
        // Get team members with their persistent point totals
        const members = await prisma.teamMember.findMany({
          where: { teamId: team.id },
          select: { userId: true, user: { select: { totalPoints: true, teamBannerColor: true, activeFlair: true } } },
        });

        const memberIds = members.map((m: { userId: string }) => m.userId);
        const puzzlesSolved = await prisma.userPuzzleProgress.count({
          where: { userId: { in: memberIds }, solved: true },
        });

        // Use the first member's banner color as the team banner (or "none" if not set)
        const bannerColor = members.find((m: any) => m.user?.teamBannerColor && m.user.teamBannerColor !== "none")?.user?.teamBannerColor ?? "none";
        return {
          teamId: team.id,
          teamName: team.name,
          isPublic: team.isPublic,
          bannerColor,
          totalPoints: members.reduce((sum: number, m: { user?: { totalPoints?: number | null } }) => sum + (m.user?.totalPoints ?? 0), 0),
          totalPuzzlesSolved: puzzlesSolved,
          memberCount: members.length,
          rank: 0,
        };
      })
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
