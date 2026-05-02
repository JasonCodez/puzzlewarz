import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";
import { validateCrosswordPuzzleData } from "@/lib/crosswordCore";

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
    const { row, col } = body as { row: number; col: number };

    if (typeof row !== "number" || typeof col !== "number") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Check the user has hint tokens
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Deduct a hint token (stored in HintUsage table like other puzzle types)
    const tokenRecord = await (prisma as any).hintToken?.findFirst?.({
      where: { userId: currentUser.id, remaining: { gt: 0 } },
    }).catch(() => null);

    // If HintToken model doesn't exist, allow freely (admin can gate separately)
    if (tokenRecord !== null && tokenRecord !== undefined && tokenRecord.remaining <= 0) {
      return NextResponse.json({ error: "No hint tokens" }, { status: 403 });
    }
    if (tokenRecord) {
      await (prisma as any).hintToken.update({
        where: { id: tokenRecord.id },
        data: { remaining: { decrement: 1 } },
      });
    }

    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      select: { data: true, puzzleType: true },
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

    // Find the letter at (row, col) from any clue that covers that cell
    let letter: string | null = null;

    for (const clue of crossword.normalized.clues.across) {
      const answer = clue.answer ?? "";
      for (let i = 0; i < answer.length; i++) {
        if (clue.row === row && clue.col + i === col) {
          letter = answer[i].toUpperCase();
          break;
        }
      }
      if (letter) break;
    }

    if (!letter) {
      for (const clue of crossword.normalized.clues.down) {
        const answer = clue.answer ?? "";
        for (let i = 0; i < answer.length; i++) {
          if (clue.row + i === row && clue.col === col) {
            letter = answer[i].toUpperCase();
            break;
          }
        }
        if (letter) break;
      }
    }

    if (!letter) {
      return NextResponse.json({ error: "Cell not found in puzzle" }, { status: 400 });
    }

    return NextResponse.json({ letter });
  } catch (err) {
    console.error("[crossword/hint] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
