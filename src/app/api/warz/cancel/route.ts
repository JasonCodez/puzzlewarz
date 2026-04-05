import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

/**
 * POST /api/warz/cancel
 * Body: { challengeId }
 * Only the challenger can cancel; only while status is OPEN.
 * Refunds the wager.
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const body = await request.json();
    const { challengeId } = body as { challengeId: string };

    if (!challengeId) {
      return NextResponse.json({ error: "challengeId required" }, { status: 400 });
    }

    const challenge = await prisma.puzzleWarzChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    if (challenge.challengerId !== currentUser.id) {
      return NextResponse.json({ error: "Only the challenger can cancel" }, { status: 403 });
    }
    if (challenge.status !== "OPEN") {
      return NextResponse.json({ error: "Challenge can only be cancelled while OPEN" }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: currentUser.id },
        data: { totalPoints: { increment: challenge.challengerWager } },
      }),
      prisma.puzzleWarzChallenge.update({
        where: { id: challengeId },
        data: { status: "CANCELLED", potPaid: true },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WARZ CANCEL]", err);
    return NextResponse.json({ error: "Failed to cancel challenge" }, { status: 500 });
  }
}
