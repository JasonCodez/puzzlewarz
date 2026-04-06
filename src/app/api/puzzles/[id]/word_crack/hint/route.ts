import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

/**
 * POST /api/puzzles/[id]/word_crack/hint
 * Body: { revealedPositions: number[] }
 *   revealedPositions — 0-based indices already shown to the user as correct
 * Response:
 *   { position: number, letter: string }  — a random un-revealed position with the correct letter
 *   { error: string }                      — on failure
 */
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
    const revealedPositions: number[] = Array.isArray(body.revealedPositions)
      ? body.revealedPositions.map(Number).filter((n: number) => !isNaN(n))
      : [];

    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      select: { data: true, puzzleType: true },
    });

    if (!puzzle || puzzle.puzzleType !== "word_crack") {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    const wordleData = (puzzle.data ?? {}) as Record<string, unknown>;
    const word = String(wordleData.word ?? "").toUpperCase().trim();

    if (!word) {
      return NextResponse.json(
        { error: "No word configured for this puzzle" },
        { status: 400 }
      );
    }

    // Collect unrevealed positions
    const unrevealed = [];
    for (let i = 0; i < word.length; i++) {
      if (!revealedPositions.includes(i)) {
        unrevealed.push(i);
      }
    }

    if (unrevealed.length === 0) {
      return NextResponse.json(
        { error: "All positions already revealed" },
        { status: 400 }
      );
    }

    // Pick a random unrevealed position
    const position = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const letter = word[position];

    return NextResponse.json({ position, letter });
  } catch (err) {
    console.error("[word_crack/hint]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
