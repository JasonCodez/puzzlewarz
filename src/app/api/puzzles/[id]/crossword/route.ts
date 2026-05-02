import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";
import { calcLevel } from "@/lib/levels";
import { awardSeasonXp } from "@/lib/seasonXp";
import { getXpMultiplier } from "@/lib/getXpMultiplier";
import {
  normalizeCrosswordAnswer,
  validateCrosswordPuzzleData,
} from "@/lib/crosswordCore";

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

    const crossword = validateCrosswordPuzzleData(puzzle.data, {
      requireAnswers: true,
      enforceStyle: false,
    });

    if (!crossword.valid || !crossword.normalized) {
      return NextResponse.json(
        { error: crossword.error ?? "Crossword puzzle data is invalid." },
        { status: 400 }
      );
    }

    const clues =
      direction === "across"
        ? crossword.normalized.clues.across
        : crossword.normalized.clues.down;

    const clue = clues.find((c) => c.number === number);
    if (!clue) {
      return NextResponse.json({ correct: false, error: "Unknown clue" });
    }

    const submittedAnswer = normalizeCrosswordAnswer(answer);
    const expectedAnswer = clue.answer ?? "";
    const correct = submittedAnswer === expectedAnswer;
    if (!correct) {
      return NextResponse.json({ correct: false });
    }

    const progress = await prisma.userPuzzleProgress.findUnique({
      where: { userId_puzzleId: { userId: currentUser.id, puzzleId } },
      select: { solved: true, completionPercentage: true, id: true },
    });

    const allClueKeys = [
      ...crossword.normalized.clues.across.map((c) => `across:${c.number}`),
      ...crossword.normalized.clues.down.map((c) => `down:${c.number}`),
    ];
    const clueKey = `${direction}:${number}`;
    const submissionFeedback = "crossword_clue_correct";

    const existingCorrectSubmission = await prisma.puzzleSubmission.findFirst({
      where: {
        puzzleId,
        userId: currentUser.id,
        isCorrect: true,
        feedback: submissionFeedback,
        answer: clueKey,
      },
      select: { id: true },
    });

    if (!existingCorrectSubmission) {
      await prisma.puzzleSubmission.create({
        data: {
          puzzleId,
          userId: currentUser.id,
          answer: clueKey,
          isCorrect: true,
          feedback: submissionFeedback,
        },
      });
    }

    const solvedSubmissions = await prisma.puzzleSubmission.findMany({
      where: {
        puzzleId,
        userId: currentUser.id,
        isCorrect: true,
        feedback: submissionFeedback,
        answer: { in: allClueKeys },
      },
      select: { answer: true },
      distinct: ["answer"],
    });

    const solvedCount = solvedSubmissions.length;
    const totalClues = allClueKeys.length;
    const allSolved = totalClues > 0 && solvedCount >= totalClues;
    const completionPct = totalClues > 0 ? (solvedCount / totalClues) * 100 : 0;

    const now = new Date();

    try {
      if (!progress) {
        const firstCorrectForClue = !existingCorrectSubmission;
        await prisma.userPuzzleProgress.create({
          data: {
            userId: currentUser.id,
            puzzleId,
            attempts: firstCorrectForClue ? 1 : 0,
            lastAttemptAt: now,
            completionPercentage: completionPct,
            ...(allSolved && { solved: true, solvedAt: now, successfulAttempts: 1 }),
          },
        });
      } else if (!progress.solved) {
        const firstCorrectForClue = !existingCorrectSubmission;
        const progressUpdate: Record<string, unknown> = {
          lastAttemptAt: now,
          completionPercentage: completionPct,
        };

        if (firstCorrectForClue) {
          progressUpdate.attempts = { increment: 1 };
        }

        if (allSolved) {
          progressUpdate.solved = true;
          progressUpdate.solvedAt = now;
          progressUpdate.successfulAttempts = { increment: 1 };
        }

        await prisma.userPuzzleProgress.update({
          where: { id: progress.id },
          data: progressUpdate,
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

    return NextResponse.json({ correct: true, allSolved, solvedCount, totalClues });
  } catch (err) {
    console.error("[crossword] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
