import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";
import { calcLevel } from "@/lib/levels";
import { awardSeasonXp } from "@/lib/seasonXp";
import { getXpMultiplier } from "@/lib/getXpMultiplier";

interface CrosswordClue {
  number: number;
  answer: string;
  row: number;
  col: number;
}

interface CrosswordData {
  clues: {
    across: CrosswordClue[];
    down: CrosswordClue[];
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const { id: puzzleId } = await context.params;
    const body = await request.json();
    const { direction, number, answer } = body as {
      direction: "across" | "down";
      number: number;
      answer: string;
    };

    if (!direction || typeof number !== "number" || !answer || typeof answer !== "string") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (direction !== "across" && direction !== "down") {
      return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
    }

    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      select: { data: true, puzzleType: true, xpReward: true, solutions: { select: { points: true }, take: 1 } },
    });

    if (!puzzle || puzzle.puzzleType !== "crossword") {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    const data = (puzzle.data ?? {}) as unknown as CrosswordData;
    const clues: CrosswordClue[] =
      direction === "across" ? (data.clues?.across ?? []) : (data.clues?.down ?? []);

    const clue = clues.find((c) => c.number === number);
    if (!clue) {
      return NextResponse.json({ correct: false, error: "Unknown clue" });
    }

    const correct = answer.toUpperCase().trim() === String(clue.answer).toUpperCase().trim();
    if (!correct) {
      return NextResponse.json({ correct: false });
    }

    // Check whether all clues are now solved by looking at current progress + this new one
    const progress = await prisma.userPuzzleProgress.findUnique({
      where: { userId_puzzleId: { userId: currentUser.id, puzzleId } },
      select: { solved: true, completionPercentage: true, id: true },
    });

    const totalClues =
      (data.clues?.across?.length ?? 0) + (data.clues?.down?.length ?? 0);

    // We track solved clue count via completionPercentage as a fraction of total
    const prevSolvedCount = progress
      ? Math.round(((progress.completionPercentage ?? 0) / 100) * totalClues)
      : 0;
    const newSolvedCount = prevSolvedCount + 1;
    const allSolved = newSolvedCount >= totalClues;
    const completionPct = totalClues > 0 ? (newSolvedCount / totalClues) * 100 : 0;

    const now = new Date();

    try {
      if (!progress) {
        await prisma.userPuzzleProgress.create({
          data: {
            userId: currentUser.id,
            puzzleId,
            attempts: 1,
            lastAttemptAt: now,
            completionPercentage: completionPct,
            ...(allSolved && { solved: true, solvedAt: now, successfulAttempts: 1 }),
          },
        });
      } else if (!progress.solved) {
        await prisma.userPuzzleProgress.update({
          where: { id: progress.id },
          data: {
            lastAttemptAt: now,
            completionPercentage: completionPct,
            ...(allSolved && {
              solved: true,
              solvedAt: now,
              successfulAttempts: { increment: 1 },
              attempts: { increment: 1 },
            }),
          },
        });
      }

      if (allSolved && !progress?.solved) {
        const awardPoints = puzzle.solutions?.[0]?.points ?? 100;

        await prisma.user.update({
          where: { id: currentUser.id },
          data: { totalPoints: { increment: awardPoints } },
        });

        const existing = await prisma.globalLeaderboard.findFirst({
          where: { userId: currentUser.id },
        });
        if (existing) {
          await prisma.globalLeaderboard.update({
            where: { id: existing.id },
            data: { totalPoints: { increment: awardPoints } },
          });
        } else {
          await prisma.globalLeaderboard.create({
            data: { userId: currentUser.id, totalPoints: awardPoints },
          });
        }

        const baseXp = puzzle.xpReward ?? 50;
        const xpMultiplier = await getXpMultiplier(currentUser.id);
        const xpGain = baseXp * xpMultiplier;
        const freshUser = await prisma.user.findUnique({
          where: { id: currentUser.id },
          select: { xp: true },
        });
        const newXp = (freshUser?.xp ?? 0) + xpGain;
        const { level, title } = calcLevel(newXp);
        await prisma.user.update({
          where: { id: currentUser.id },
          data: { xp: newXp, level, xpTitle: title },
        });
        await awardSeasonXp(currentUser.id, xpGain);
      }
    } catch (persistErr) {
      console.error("[crossword] Failed to persist progress:", persistErr);
    }

    return NextResponse.json({ correct: true, allSolved });
  } catch (err) {
    console.error("[crossword] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
