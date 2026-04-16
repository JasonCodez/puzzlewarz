import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

/**
 * GET /api/puzzles/[id]/comparison-stats
 * Returns post-solve comparison data for the current user vs other solvers.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const { id: puzzleId } = await context.params;

    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      select: { puzzleType: true, title: true },
    });
    if (!puzzle) return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });

    // Total non-bot attempts and solves
    const [attemptCount, solverCount] = await Promise.all([
      prisma.userPuzzleProgress.count({
        where: { puzzleId, user: { isBot: false } },
      }),
      prisma.userPuzzleProgress.count({
        where: { puzzleId, solved: true, user: { isBot: false } },
      }),
    ]);

    const solveRate = attemptCount > 0 ? Math.round((solverCount / attemptCount) * 100) : 0;

    // Current user's progress
    const userProgress = await prisma.userPuzzleProgress.findUnique({
      where: { userId_puzzleId: { userId: currentUser.id, puzzleId } },
      select: { attempts: true, solved: true },
    });

    let avgGuesses: number | null = null;
    let userGuesses: number | null = null;
    let guessPercentile: number | null = null;

    // For word_crack: attempts = guesses used (one increment per submitted guess)
    if (puzzle.puzzleType === "word_crack") {
      const solvedRecords = await prisma.userPuzzleProgress.findMany({
        where: { puzzleId, solved: true, user: { isBot: false } },
        select: { attempts: true, userId: true },
      });

      if (solvedRecords.length > 0) {
        const total = solvedRecords.reduce((sum, r) => sum + (r.attempts ?? 0), 0);
        avgGuesses = Math.round((total / solvedRecords.length) * 10) / 10;
      }

      if (userProgress?.solved && userProgress.attempts != null) {
        userGuesses = userProgress.attempts;
        // Percentile = % of OTHER solvers who used MORE guesses (lower guesses = better)
        const others = solvedRecords.filter((r) => r.userId !== currentUser.id);
        if (others.length > 0) {
          const beaten = others.filter((r) => (r.attempts ?? 0) > userGuesses!).length;
          guessPercentile = Math.round((beaten / others.length) * 100);
        }
      }
    }

    return NextResponse.json({
      puzzleType: puzzle.puzzleType,
      puzzleTitle: puzzle.title,
      solverCount,
      attemptCount,
      solveRate,
      avgGuesses,
      userGuesses,
      guessPercentile,
    });
  } catch (err) {
    console.error("[COMPARISON STATS]", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
