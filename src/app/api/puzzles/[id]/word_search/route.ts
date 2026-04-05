import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";
import { calcLevel } from "@/lib/levels";

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
    const { word, cells, allFoundWords, warzMode } = body as {
      word: string;
      cells: { row: number; col: number }[];
      allFoundWords: string[];
      warzMode?: boolean;
    };

    if (!word || typeof word !== "string") {
      return NextResponse.json({ error: "No word provided" }, { status: 400 });
    }

    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      select: {
        data: true,
        puzzleType: true,
        xpReward: true,
        solutions: { select: { points: true }, take: 1 },
      },
    });

    if (!puzzle || puzzle.puzzleType !== "word_search") {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    const wsData = (puzzle.data ?? {}) as Record<string, unknown>;
    const grid = (wsData.grid ?? []) as string[][];
    const puzzleWords = ((wsData.words ?? []) as string[]).map((w) =>
      String(w).toUpperCase().trim()
    );

    const cleanWord = word.toUpperCase().trim();

    // Validate the word is in the puzzle's word list
    if (!puzzleWords.includes(cleanWord)) {
      return NextResponse.json({ valid: false, error: "Word not in puzzle" });
    }

    // Validate cells: they must spell the word (or its reverse) on the actual grid
    if (Array.isArray(cells) && cells.length === cleanWord.length) {
      const spelled = cells
        .map((c) => grid[c.row]?.[c.col] ?? "")
        .join("");
      const spelledReverse = spelled.split("").reverse().join("");
      if (spelled !== cleanWord && spelledReverse !== cleanWord) {
        return NextResponse.json({ valid: false, error: "Invalid selection" });
      }
    }

    // Validate allFoundWords — all entries must be genuine puzzle words to prevent stuffing
    const validFoundWords = Array.isArray(allFoundWords)
      ? allFoundWords.filter((w) =>
          puzzleWords.includes(String(w).toUpperCase().trim())
        )
      : [cleanWord];

    const allFound = validFoundWords.length >= puzzleWords.length;

    // Persist progress
    if (!warzMode) try {
      const now = new Date();

      let progress = await prisma.userPuzzleProgress.findUnique({
        where: { userId_puzzleId: { userId: currentUser.id, puzzleId } },
      });

      if (!progress) {
        progress = await prisma.userPuzzleProgress.create({
          data: { userId: currentUser.id, puzzleId },
        });
      }

      if (!progress.solved) {
        const completionPct = (validFoundWords.length / puzzleWords.length) * 100;

        await prisma.userPuzzleProgress.update({
          where: { id: progress.id },
          data: {
            attempts: { increment: 1 },
            lastAttemptAt: now,
            completionPercentage: completionPct,
            ...(allFound && {
              solved: true,
              solvedAt: now,
              successfulAttempts: { increment: 1 },
            }),
          },
        });

        if (allFound) {
          const awardPoints = puzzle.solutions?.[0]?.points ?? 100;

          await prisma.userPuzzleProgress.update({
            where: { id: progress.id },
            data: { pointsEarned: { increment: awardPoints } },
          });

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

          const xpGain = puzzle.xpReward ?? 50;
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
        }
      }
    } catch (persistErr) {
      console.error("[word_search] Failed to persist progress:", persistErr);
      // Non-fatal: still return the result to the player
    }

    return NextResponse.json({
      valid: true,
      allFound,
      foundCount: validFoundWords.length,
      total: puzzleWords.length,
    });
  } catch (err) {
    console.error("[word_search] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
