import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = session.user?.email ?? undefined;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const url = new URL(request.url);
    const puzzleId = url.searchParams.get('puzzleId');

    // Check if the user is a member of any team (team puzzles should not require admin privileges).
    const memberships = await prisma.teamMember.findMany({
      where: { userId: user.id },
      select: { teamId: true, role: true, joinedAt: true },
      orderBy: { joinedAt: 'asc' },
    });

    const isMember = memberships.length > 0;
    const isAdmin = memberships.some((m) => ["admin", "moderator"].includes(m.role));

    if (!isMember) {
      return NextResponse.json({ isMember: false, isAdmin: false, teamId: null, teamName: null, teams: [] });
    }

    // For escape rooms (and most team puzzles), prefer a team with exactly 4 members.
    let preferExactFour = false;
    if (puzzleId) {
      try {
        const puzzle = await prisma.puzzle.findUnique({ where: { id: puzzleId }, select: { puzzleType: true, isTeamPuzzle: true } });
        preferExactFour = !!puzzle && puzzle.isTeamPuzzle && puzzle.puzzleType === 'escape_room';
      } catch {
        // ignore
      }
    }

    const uniqueTeamIds = Array.from(new Set(memberships.map((m) => m.teamId)));
    const teams = await Promise.all(
      uniqueTeamIds.map(async (teamId) => {
        const [team, memberCount] = await Promise.all([
          prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } }),
          prisma.teamMember.count({ where: { teamId } }),
        ]);
        const role = memberships.find((m) => m.teamId === teamId)?.role ?? 'member';
        return { teamId, teamName: team?.name ?? null, memberCount, role };
      })
    );

    let chosen = teams[0];
    if (preferExactFour) {
      chosen = teams.find((t) => t.memberCount === 4) ?? chosen;
    }

    return NextResponse.json({
      isMember: true,
      isAdmin,
      teamId: chosen?.teamId ?? null,
      teamName: chosen?.teamName ?? null,
      teams,
    });
  } catch (error) {
    console.error('Failed to check team admin:', error);
    return NextResponse.json({ error: 'Failed to check team membership' }, { status: 500 });
  }
}
