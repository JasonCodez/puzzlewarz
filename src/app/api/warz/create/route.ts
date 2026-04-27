import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

const ALLOWED_TYPES = ["sudoku", "word_crack", "word_search", "jigsaw", "anagram_blitz", "arg"];
const MAX_WAGER = 500;
const MIN_WAGER = 10;

/**
 * POST /api/warz/create
 *
 * Called after the challenger finishes the puzzle in Warz mode.
 * Body: { puzzleId, completionSeconds, wager, invitedUserId? }
 *
 * Flow:
 *  1. Verify eligibility (no prior progress on this puzzle)
 *  2. Verify sufficient points balance
 *  3. Deduct wager (escrow)
 *  4. Record challenger time
 *  5. Create OPEN challenge
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const body = await request.json();
    const { puzzleId, completionSeconds, wager, invitedUserId } = body as {
      puzzleId: string;
      completionSeconds: number;
      wager: number;
      invitedUserId?: string;
    };

    // Validate inputs
    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json({ error: "puzzleId required" }, { status: 400 });
    }
    if (typeof completionSeconds !== "number" || completionSeconds <= 0) {
      return NextResponse.json({ error: "completionSeconds must be a positive number" }, { status: 400 });
    }
    if (typeof wager !== "number" || wager < MIN_WAGER || wager > MAX_WAGER) {
      return NextResponse.json({ error: `Wager must be between ${MIN_WAGER} and ${MAX_WAGER} points` }, { status: 400 });
    }

    // Validate puzzle
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      select: { id: true, isActive: true, puzzleType: true, title: true },
    });
    if (!puzzle || !puzzle.isActive) {
      return NextResponse.json({ error: "Puzzle not found or inactive" }, { status: 404 });
    }
    if (!ALLOWED_TYPES.includes(puzzle.puzzleType)) {
      return NextResponse.json({ error: "Puzzle type not allowed in Warz" }, { status: 400 });
    }

    // Check eligibility:
    // - no prior normal puzzle progress
    // - no already-open challenge by this user on this puzzle
    // - user has never participated in Warz on this puzzle (as challenger or opponent)
    const [existing, duplicateChallenge, priorWarzParticipation] = await Promise.all([
      prisma.userPuzzleProgress.findUnique({
        where: { userId_puzzleId: { userId: currentUser.id, puzzleId } },
      }),
      prisma.puzzleWarzChallenge.findFirst({
        where: { challengerId: currentUser.id, puzzleId, status: "OPEN" },
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

    if (existing && (existing.solved || existing.attempts > 0)) {
      return NextResponse.json(
        { error: "You have already attempted this puzzle and cannot challenge on it" },
        { status: 409 }
      );
    }

    if (duplicateChallenge) {
      return NextResponse.json(
        { error: "You already have an open challenge on this puzzle" },
        { status: 409 }
      );
    }

    if (priorWarzParticipation) {
      return NextResponse.json(
        { error: "You have already played this puzzle in Warz and cannot challenge on it again" },
        { status: 409 }
      );
    }

    // Fresh user read for points balance and challenge slot limit
    const freshUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { totalPoints: true, warzChallengeSlots: true },
    });
    if (!freshUser || freshUser.totalPoints < wager) {
      return NextResponse.json(
        { error: "Insufficient points balance" },
        { status: 400 }
      );
    }

    // Enforce challenge slot limit
    const openChallengeCount = await prisma.puzzleWarzChallenge.count({
      where: { challengerId: currentUser.id, status: "OPEN" },
    });
    const slotLimit = freshUser.warzChallengeSlots ?? 3;
    if (openChallengeCount >= slotLimit) {
      return NextResponse.json(
        { error: `You have reached your challenge slot limit (${slotLimit}). Buy more slots in the Store, or wait for open challenges to resolve.` },
        { status: 409 }
      );
    }

    // Validate invited user if provided
    if (invitedUserId) {
      const invitee = await prisma.user.findUnique({ where: { id: invitedUserId }, select: { id: true } });
      if (!invitee) {
        return NextResponse.json({ error: "Invited user not found" }, { status: 404 });
      }
      if (invitedUserId === currentUser.id) {
        return NextResponse.json({ error: "You cannot challenge yourself" }, { status: 400 });
      }
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Atomic: deduct wager + create challenge
    const [, challenge] = await prisma.$transaction([
      prisma.user.update({
        where: { id: currentUser.id },
        data: { totalPoints: { decrement: wager } },
      }),
      prisma.puzzleWarzChallenge.create({
        data: {
          puzzleId,
          challengerId: currentUser.id,
          challengerTime: Math.round(completionSeconds),
          challengerWager: wager,
          invitedUserId: invitedUserId || null,
          expiresAt,
        },
        include: {
          puzzle: { select: { id: true, title: true, difficulty: true, puzzleType: true } },
          challenger: { select: { id: true, name: true, image: true, level: true } },
          invitedUser: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Send notification to invited user if targeted
    if (invitedUserId) {
      try {
        await prisma.notification.create({
          data: {
            userId: invitedUserId,
            type: "warz_challenge",
            title: "⚔️ You've been challenged!",
            message: `${currentUser.name ?? "Someone"} challenged you to "${puzzle.title}" for ${wager} points.`,
            icon: "⚔️",
            relatedId: challenge.id,
            expiresAt,
          },
        });
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({ challenge }, { status: 201 });
  } catch (err) {
    console.error("[WARZ CREATE]", err);
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 });
  }
}
