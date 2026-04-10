import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateSameOrigin } from "@/lib/requestSecurity";

export type EscapeRoomTeamContext = {
  /** Holds the actual teamId OR the lobbyId when isLobby=true. Used as the socket room key. */
  teamId: string;
  userId: string;
  escapeRoomId: string;
  /** True when this session was initiated from an EscapeRoomLobby (ad-hoc 1-4 player run). */
  isLobby?: boolean;
};

async function getUserIdFromSessionEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}

/**
 * Returns the Prisma `where` clause for findFirst on TeamEscapeProgress.
 * In lobby mode teamId holds the lobbyId; use the lobbyId column instead.
 */
export function progressWhereClause(ctx: EscapeRoomTeamContext) {
  if (ctx.isLobby) {
    return { lobbyId: ctx.teamId, escapeRoomId: ctx.escapeRoomId };
  }
  return { teamId: ctx.teamId, escapeRoomId: ctx.escapeRoomId };
}

/**
 * Returns the member user-IDs for this session (lobby members or team members).
 */
export async function getSessionMembers(ctx: EscapeRoomTeamContext) {
  if (ctx.isLobby) {
    const rows = await (prisma as any).escapeRoomLobbyMember.findMany({
      where: { lobbyId: ctx.teamId },
      select: { userId: true },
    });
    return rows as Array<{ userId: string }>;
  }
  return prisma.teamMember.findMany({ where: { teamId: ctx.teamId }, select: { userId: true } });
}

/**
 * Returns the host/leader userId for this session.
 * For lobby runs: reads from the DB lobby record.
 * For team runs: the caller is expected to use the in-memory teamLobbyStore.
 */
export async function getLobbyHostId(ctx: EscapeRoomTeamContext): Promise<string | null> {
  if (!ctx.isLobby) return null;
  const lobby = await (prisma as any).escapeRoomLobby.findUnique({
    where: { id: ctx.teamId },
    select: { hostId: true },
  });
  return lobby?.hostId ?? null;
}

export async function requireEscapeRoomTeamContext(
  request: NextRequest,
  puzzleId: string,
  options?: {
    teamId?: string | null;
    lobbyId?: string | null;
    requireStarted?: boolean;
    requireNotFinished?: boolean;
    allowUserFailed?: boolean;
  }
): Promise<EscapeRoomTeamContext | NextResponse> {
  const requireStarted = options?.requireStarted ?? true;
  const requireNotFinished = options?.requireNotFinished ?? true;
  const allowUserFailed = options?.allowUserFailed ?? false;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getUserIdFromSessionEmail(session.user.email);
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // ── Lobby mode (ad-hoc 1-4 player run, no permanent team required) ──
  const lobbyId = options?.lobbyId ?? request.nextUrl.searchParams.get("lobbyId");
  if (lobbyId) {
    const lobby = await (prisma as any).escapeRoomLobby.findUnique({
      where: { id: lobbyId },
      select: { id: true, puzzleId: true, status: true },
    });
    if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
    if (lobby.puzzleId !== puzzleId) {
      return NextResponse.json({ error: "Lobby is not for this puzzle" }, { status: 400 });
    }

    const member = await (prisma as any).escapeRoomLobbyMember.findUnique({
      where: { lobbyId_userId: { lobbyId, userId } },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "You are not in this lobby" }, { status: 403 });

    const escapeRoom = await prisma.escapeRoomPuzzle.findUnique({ where: { puzzleId }, select: { id: true } });
    if (!escapeRoom) return NextResponse.json({ error: "Escape room not found" }, { status: 404 });

    if (!allowUserFailed) {
      try {
        const up = await prisma.userEscapeProgress.findUnique({
          where: { userId_escapeRoomId: { userId, escapeRoomId: escapeRoom.id } },
          select: { failedAt: true },
        });
        if (up?.failedAt) {
          return NextResponse.json({ error: "You have already failed this escape room." }, { status: 403 });
        }
      } catch { /* non-fatal */ }
    }

    if (requireStarted) {
      if (lobby.status !== "started") {
        return NextResponse.json({ error: "The lobby run has not started yet." }, { status: 409 });
      }
      const progress = await (prisma as any).teamEscapeProgress.findFirst({
        where: { lobbyId, escapeRoomId: escapeRoom.id },
        select: { id: true, failedAt: true, completedAt: true },
      });
      if (!progress) {
        return NextResponse.json({ error: "No active run found for this lobby." }, { status: 409 });
      }
      if (requireNotFinished) {
        if (progress.completedAt) return NextResponse.json({ error: "This run is already complete." }, { status: 409 });
        if (progress.failedAt) return NextResponse.json({ error: "This run has already failed." }, { status: 409 });
      }
    }

    return { teamId: lobbyId, userId, escapeRoomId: escapeRoom.id, isLobby: true };
  }

  // ── Team mode (existing flow, unchanged) ──
  const teamId = options?.teamId ?? request.nextUrl.searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json({ error: "teamId or lobbyId is required" }, { status: 400 });
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { teamId: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this team" }, { status: 403 });
  }

  const memberCount = await prisma.teamMember.count({ where: { teamId } });
  const puzzleForMin = await prisma.puzzle.findUnique({ where: { id: puzzleId }, select: { minTeamSize: true } });
  const minRequired = (puzzleForMin?.minTeamSize ?? 0) > 0 ? puzzleForMin!.minTeamSize : 1;
  if (memberCount < minRequired) {
    return NextResponse.json(
      { error: `Escape room requires at least ${minRequired} team member(s) (team has ${memberCount})` },
      { status: 403 }
    );
  }

  const escapeRoom = await prisma.escapeRoomPuzzle.findUnique({ where: { puzzleId }, select: { id: true } });
  if (!escapeRoom) return NextResponse.json({ error: "Escape room not found" }, { status: 404 });

  if (!allowUserFailed) {
    try {
      const userProgress = await prisma.userEscapeProgress.findUnique({
        where: { userId_escapeRoomId: { userId, escapeRoomId: escapeRoom.id } },
        select: { failedAt: true },
      });
      if (userProgress?.failedAt) {
        return NextResponse.json(
          { error: "You have already failed this escape room and no longer have access to it." },
          { status: 403 }
        );
      }
    } catch { /* non-fatal */ }
  }

  if (requireStarted) {
    const progress = await (prisma as any).teamEscapeProgress.findFirst({
      where: { teamId, escapeRoomId: escapeRoom.id },
      select: { id: true, failedAt: true, completedAt: true },
    });
    if (!progress) {
      return NextResponse.json(
        { error: "Escape room has not been started for this team. Start from the team lobby." },
        { status: 409 }
      );
    }
    if (requireNotFinished) {
      if (progress.completedAt) return NextResponse.json({ error: "This escape room run is already complete." }, { status: 409 });
      if (progress.failedAt) return NextResponse.json({ error: "This escape room run has already failed and cannot be retried." }, { status: 409 });
    }
  }

  return { teamId, userId, escapeRoomId: escapeRoom.id };
}
