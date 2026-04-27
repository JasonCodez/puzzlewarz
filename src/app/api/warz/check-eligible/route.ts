import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";

/**
 * GET /api/warz/check-eligible?puzzleId=<id>
 *
 * Returns { eligible: true } if the current user can create a Warz challenge on this puzzle.
 * Returns { eligible: false, reason: string } if not.
 *
 * Ineligible when:
 *  - User has prior progress (solved or any attempts) on this puzzle
 *  - User already has an OPEN challenge on this puzzle
 *  - User has already participated in Warz on this puzzle (challenger or opponent)
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const { searchParams } = new URL(request.url);
    const puzzleId = searchParams.get("puzzleId");
    if (!puzzleId) {
      return NextResponse.json({ error: "puzzleId required" }, { status: 400 });
    }

    const [progress, openChallenge, priorWarzParticipation] = await Promise.all([
      prisma.userPuzzleProgress.findUnique({
        where: { userId_puzzleId: { userId: currentUser.id, puzzleId } },
        select: { solved: true, attempts: true },
      }),
      prisma.puzzleWarzChallenge.findFirst({
        where: { challengerId: currentUser.id, puzzleId, status: "OPEN" },
        select: { id: true },
      }),
      prisma.puzzleWarzChallenge.findFirst({
        where: {
          puzzleId,
          OR: [
            { challengerId: currentUser.id },
            { opponentId: currentUser.id },
          ],
        },
        select: { id: true },
      }),
    ]);

    if (progress && (progress.solved || progress.attempts > 0)) {
      return NextResponse.json({
        eligible: false,
        reason: "You have already attempted this puzzle and cannot challenge on it.",
      });
    }

    if (openChallenge) {
      return NextResponse.json({
        eligible: false,
        reason: "You already have an open challenge on this puzzle. It will expire in 24 hours if no one accepts.",
      });
    }

    if (priorWarzParticipation) {
      return NextResponse.json({
        eligible: false,
        reason: "You have already played this puzzle in Warz and cannot challenge on it again.",
      });
    }

    return NextResponse.json({ eligible: true });
  } catch (err) {
    console.error("[WARZ CHECK ELIGIBLE]", err);
    return NextResponse.json({ error: "Failed to check eligibility" }, { status: 500 });
  }
}
