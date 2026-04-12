import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/gridlock/recent-solves
// Public — returns last N gridlock solves for homepage social proof feed.
// Excludes bot accounts from the display name but counts their solves.
export async function GET() {
  try {
    const solves = await prisma.gridlockSolve.findMany({
      where: {
        // Only show solves with a linked user (auth or ghost) for display names
        userId: { not: null },
        user: { isHidden: false },
      },
      orderBy: { solvedAt: "desc" },
      take: 20,
      select: {
        id: true,
        rank: true,
        elapsedSeconds: true,
        solvedAt: true,
        puzzle: {
          select: { data: true },
        },
        user: {
          select: { name: true, isBot: true, level: true },
        },
      },
    });

    const feed = solves.map((s) => {
      // Extract file number from puzzle data
      let fileTitle: string | null = null;
      let fileNumber: number | null = null;
      try {
        const d = s.puzzle?.data as Record<string, unknown> | null;
        if (d) {
          fileTitle = (d.fileTitle as string) ?? null;
          fileNumber = (d.fileNumber as number) ?? null;
        }
      } catch { /* ignore */ }

      const minsAgo = Math.floor((Date.now() - new Date(s.solvedAt).getTime()) / 60000);

      return {
        id: s.id,
        username: s.user?.name ?? "Anonymous",
        isBot: s.user?.isBot ?? false,
        level: s.user?.level ?? 1,
        rank: s.rank,
        elapsedSeconds: s.elapsedSeconds,
        fileTitle,
        fileNumber,
        minsAgo,
      };
    });

    return NextResponse.json({ feed });
  } catch (e) {
    console.error("[gridlock/recent-solves]", e);
    return NextResponse.json({ feed: [] });
  }
}
