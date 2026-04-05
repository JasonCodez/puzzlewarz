import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

const DNF_SENTINEL = 999999; // "Did Not Finish" time — loses to any real time

/**
 * POST /api/warz/complete
 *
 * Called after the opponent finishes (or forfeits) their Warz run.
 * The challenger's time was locked on creation, so we only need the opponent result.
 *
 * Body: { challengeId, completionSeconds } | { challengeId, forfeited: true }
 *
 * Flow:
 *  1. Validate it's the opponent calling
 *  2. Record opponentTime (DNF_SENTINEL if forfeited)
 *  3. Determine winner:
 *     - Both forfeited (both = DNF_SENTINEL) → split (each gets their wager back)
 *     - Lower time wins the full pot
 *     - Tie (same time in seconds) → split
 *  4. Transfer points, mark COMPLETED
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const body = await request.json();
    const { challengeId, completionSeconds, forfeited } = body as {
      challengeId: string;
      completionSeconds?: number;
      forfeited?: boolean;
    };

    if (!challengeId) {
      return NextResponse.json({ error: "challengeId required" }, { status: 400 });
    }

    const challenge = await prisma.puzzleWarzChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }
    if (challenge.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Challenge is not in progress" }, { status: 409 });
    }
    if (challenge.opponentId !== currentUser.id) {
      return NextResponse.json({ error: "You are not the opponent in this challenge" }, { status: 403 });
    }
    if (challenge.opponentTime != null) {
      return NextResponse.json({ error: "You have already submitted a result" }, { status: 409 });
    }

    const opponentTime = forfeited
      ? DNF_SENTINEL
      : typeof completionSeconds === "number" && completionSeconds > 0
      ? Math.round(completionSeconds)
      : null;

    if (opponentTime === null) {
      return NextResponse.json(
        { error: "completionSeconds must be a positive number, or set forfeited: true" },
        { status: 400 }
      );
    }

    const challengerTime = challenge.challengerTime; // already locked

    // Determine outcome
    let winnerId: string | null = null;
    let outcome: "challenger" | "opponent" | "split";

    if (challengerTime === DNF_SENTINEL && opponentTime === DNF_SENTINEL) {
      // Both forfeited — split
      outcome = "split";
    } else if (challengerTime <= opponentTime) {
      // Challenger wins (lower time or opponent DNF)
      outcome = "challenger";
      winnerId = challenge.challengerId;
    } else {
      // Opponent wins
      outcome = "opponent";
      winnerId = currentUser.id;
    }

    const pot = challenge.challengerWager * 2;

    // Atomic: pay out + mark COMPLETED
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payoutOps: any[] = [
      prisma.puzzleWarzChallenge.update({
        where: { id: challengeId },
        data: {
          opponentTime,
          status: "COMPLETED",
          winnerId,
          potPaid: true,
          completedAt: new Date(),
        },
        include: {
          puzzle: { select: { id: true, title: true, difficulty: true, puzzleType: true } },
          challenger: { select: { id: true, name: true, image: true, level: true } },
          opponent: { select: { id: true, name: true, image: true, level: true } },
          winner: { select: { id: true, name: true } },
        },
      }),
    ];

    if (outcome === "split") {
      // Return each player's wager
      payoutOps.push(
        prisma.user.update({ where: { id: challenge.challengerId }, data: { totalPoints: { increment: challenge.challengerWager } } }),
        prisma.user.update({ where: { id: currentUser.id }, data: { totalPoints: { increment: challenge.challengerWager } } })
      );
    } else if (outcome === "challenger") {
      payoutOps.push(
        prisma.user.update({ where: { id: challenge.challengerId }, data: { totalPoints: { increment: pot } } })
      );
    } else {
      payoutOps.push(
        prisma.user.update({ where: { id: currentUser.id }, data: { totalPoints: { increment: pot } } })
      );
    }

    const [updatedChallenge] = await prisma.$transaction(payoutOps as any);

    // Notify the challenger of the outcome
    try {
      let msg: string;
      if (outcome === "split") {
        msg = "Both players forfeited. Your wager has been refunded.";
      } else if (outcome === "challenger") {
        msg = `You won the Warz battle against ${currentUser.name ?? "your opponent"}! +${pot} pts`;
      } else {
        msg = `You lost the Warz battle. ${currentUser.name ?? "Your opponent"} solved it faster.`;
      }
      await prisma.notification.create({
        data: {
          userId: challenge.challengerId,
          type: "warz_completed",
          title: outcome === "challenger" ? "🏆 You Won!" : outcome === "split" ? "🤝 Draw" : "💀 You Lost",
          message: msg,
          icon: outcome === "challenger" ? "🏆" : outcome === "split" ? "🤝" : "💀",
          relatedId: challengeId,
        },
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({ challenge: updatedChallenge, outcome, pot, winnerId });
  } catch (err) {
    console.error("[WARZ COMPLETE]", err);
    return NextResponse.json({ error: "Failed to complete challenge" }, { status: 500 });
  }
}
