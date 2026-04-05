import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";

const ALLOWED_TYPES = ["sudoku", "word_crack", "word_search", "jigsaw"];

// GET /api/warz/eligible-puzzles
// Returns puzzles the current user is eligible to challenge on:
//   - allowed puzzle type
//   - active
//   - user has NOT previously solved OR failed this puzzle
export async function GET(_request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    // Find puzzles the user has any progress on (solved or had attempts)
    const [userProgress, openChallenges] = await Promise.all([
      prisma.userPuzzleProgress.findMany({
        where: { userId: currentUser.id },
        select: { puzzleId: true, solved: true, attempts: true },
      }),
      prisma.puzzleWarzChallenge.findMany({
        where: { challengerId: currentUser.id, status: "OPEN" },
        select: { puzzleId: true },
      }),
    ]);
    const ineligibleIds = new Set([
      ...userProgress
        .filter((p) => p.solved || p.attempts > 0)
        .map((p) => p.puzzleId),
      ...openChallenges.map((c) => c.puzzleId),
    ]);

    const puzzles = await prisma.puzzle.findMany({
      where: {
        isActive: true,
        isWarzExclusive: true,
      },
      select: {
        id: true,
        title: true,
        difficulty: true,
        puzzleType: true,
        category: { select: { name: true } },
      },
      orderBy: [{ difficulty: "asc" }, { title: "asc" }],
    });

    const eligible = puzzles.filter((p) => !ineligibleIds.has(p.id));

    return NextResponse.json({ puzzles: eligible });
  } catch (err) {
    console.error("[WARZ ELIGIBLE]", err);
    return NextResponse.json({ error: "Failed to fetch eligible puzzles" }, { status: 500 });
  }
}
