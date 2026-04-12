import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";
import { calcLevel } from "@/lib/levels";
import { awardSeasonXp } from "@/lib/seasonXp";
import { incrementStreak } from "@/lib/streakService";
import { getXpMultiplier } from "@/lib/getXpMultiplier";

/**
 * POST /api/puzzles/[id]/skip
 * Skip a puzzle using one skip token. The puzzle is marked as completed and the
 * user receives full XP + points as if they had solved it normally.
 */
export async function POST(
  request: NextRequest,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    // Unwrap params (Next.js app router may pass a Promise)
    let puzzleId: string;
    if (context.params instanceof Promise) {
      const resolved = await context.params;
      puzzleId = resolved.id;
    } else {
      puzzleId = context.params.id;
    }

    // Load puzzle
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      include: { solutions: true, parts: true },
    });
    if (!puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    // Check existing progress — don't let someone skip an already-solved puzzle
    const existingProgress = await prisma.userPuzzleProgress.findUnique({
      where: { userId_puzzleId: { userId: currentUser.id, puzzleId } },
    });
    if (existingProgress?.solved) {
      return NextResponse.json(
        { error: "You have already completed this puzzle." },
        { status: 409 }
      );
    }

    // Check skip token balance
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { skipTokens: true, xp: true },
    });
    if (!user || user.skipTokens < 1) {
      return NextResponse.json(
        { error: "No skip tokens. Purchase one in the Store." },
        { status: 400 }
      );
    }

    // Determine points to award (mirrors progress route attempt_success logic)
    let awardPoints = 100;
    if (puzzle.solutions && puzzle.solutions.length > 0) {
      awardPoints = puzzle.solutions[0].points ?? awardPoints;
    } else if (puzzle.parts && puzzle.parts.length > 0) {
      awardPoints =
        puzzle.parts.reduce(
          (sum: number, part: { pointsValue?: number | null }) =>
            sum + (part.pointsValue ?? 0),
          0
        ) || awardPoints;
    }

    const baseXp = puzzle.xpReward ?? 50;
    const xpMultiplier = await getXpMultiplier(currentUser.id);
    const xpGain = baseXp * xpMultiplier;

    // Run all DB writes in a transaction
    await prisma.$transaction(async (tx) => {
      // Decrement skip token
      await tx.user.update({
        where: { id: currentUser.id },
        data: { skipTokens: { decrement: 1 } },
      });

      // Upsert progress as solved
      const upserted = await tx.userPuzzleProgress.upsert({
        where: { userId_puzzleId: { userId: currentUser.id, puzzleId } },
        create: {
          userId: currentUser.id,
          puzzleId,
          solved: true,
          solvedAt: new Date(),
          attempts: 1,
          successfulAttempts: 1,
          lastAttemptAt: new Date(),
          pointsEarned: awardPoints,
        },
        update: {
          solved: true,
          solvedAt: new Date(),
          attempts: { increment: 1 },
          successfulAttempts: { increment: 1 },
          lastAttemptAt: new Date(),
          pointsEarned: { increment: awardPoints },
        },
      });

      // Award points to user totals + leaderboard
      await tx.user.update({
        where: { id: currentUser.id },
        data: { totalPoints: { increment: awardPoints } },
      });

      const existingLb = await tx.globalLeaderboard.findFirst({
        where: { userId: currentUser.id },
      });
      if (existingLb) {
        await tx.globalLeaderboard.update({
          where: { id: existingLb.id },
          data: { totalPoints: { increment: awardPoints } },
        });
      } else {
        await tx.globalLeaderboard.create({
          data: { userId: currentUser.id, totalPoints: awardPoints },
        });
      }

      // Award XP
      const newXp = (user.xp ?? 0) + xpGain;
      const { level, title } = calcLevel(newXp);
      await tx.user.update({
        where: { id: currentUser.id },
        data: { xp: newXp, level, xpTitle: title },
      });

      return upserted;
    });

    // Season XP (outside transaction — non-critical)
    try {
      await awardSeasonXp(currentUser.id, xpGain);
    } catch (err) {
      console.error("[PUZZLE SKIP] Failed to award season XP:", err);
    }

    // Streak (outside transaction — non-critical)
    try {
      await incrementStreak(currentUser.id);
    } catch (err) {
      console.error("[PUZZLE SKIP] Failed to update streak:", err);
    }

    // Real-time leaderboard broadcast (non-critical)
    try {
      const socketUrl = process.env.SOCKET_URL;
      if (socketUrl) {
        fetch(`${socketUrl}/emit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-socket-secret": process.env.SOCKET_SECRET ?? "",
          },
          body: JSON.stringify({
            event: "leaderboard:update",
            payload: { userId: currentUser.id },
          }),
        }).catch(() => {});
      }
    } catch {
      /* non-critical */
    }

    // Fetch fresh skip token count to return to client
    const fresh = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { skipTokens: true },
    });

    return NextResponse.json({
      success: true,
      xpGained: xpGain,
      pointsAwarded: awardPoints,
      remainingTokens: fresh?.skipTokens ?? 0,
    });
  } catch (err) {
    console.error("[PUZZLE SKIP]", err);
    return NextResponse.json(
      { error: "Failed to skip puzzle" },
      { status: 500 }
    );
  }
}
