import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";

const ALLOWED_TYPES = ["sudoku", "word_crack", "word_search", "jigsaw"];
const MAX_WAGER = 500;

// GET /api/warz — list challenges (lobby feed)
// Query params: status (OPEN | IN_PROGRESS), page, limit
export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") || "OPEN";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const skip = (page - 1) * limit;

    // Expire stale OPEN challenges on read (best-effort, no cron needed)
    await prisma.puzzleWarzChallenge.updateMany({
      where: {
        status: "OPEN",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    // Refund challengers for newly-expired challenges that haven't been paid yet
    const justExpired = await prisma.puzzleWarzChallenge.findMany({
      where: { status: "EXPIRED", potPaid: false },
      select: { id: true, challengerId: true, challengerWager: true },
    });
    for (const c of justExpired) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: c.challengerId },
          data: { totalPoints: { increment: c.challengerWager } },
        }),
        prisma.puzzleWarzChallenge.update({
          where: { id: c.id },
          data: { potPaid: true },
        }),
      ]);
    }

    const where: Record<string, unknown> =
      status === "ALL"
        ? {}
        : { status };

    const [challenges, total] = await Promise.all([
      prisma.puzzleWarzChallenge.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          puzzle: { select: { id: true, title: true, difficulty: true, puzzleType: true } },
          challenger: { select: { id: true, name: true, image: true, level: true } },
          opponent: { select: { id: true, name: true, image: true, level: true } },
          winner: { select: { id: true, name: true } },
          invitedUser: { select: { id: true, name: true } },
        },
      }),
      prisma.puzzleWarzChallenge.count({ where }),
    ]);

    // Sort spotlighted challenges to the top (spotlightUntil > now)
    const now = new Date();
    challenges.sort((a, b) => {
      const aSpot = a.spotlightUntil && a.spotlightUntil > now ? 1 : 0;
      const bSpot = b.spotlightUntil && b.spotlightUntil > now ? 1 : 0;
      return bSpot - aSpot; // spotlighted first
    });

    return NextResponse.json({ challenges, total, page, limit });
  } catch (err) {
    console.error("[WARZ GET]", err);
    return NextResponse.json({ error: "Failed to load challenges" }, { status: 500 });
  }
}
