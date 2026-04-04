import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: puzzleId } = await params;

    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        escapeRoom: {
          select: {
            id: true,
            roomTitle: true,
            roomDescription: true,
            timeLimitSeconds: true,
            minTeamSize: true,
            maxTeamSize: true,
          },
        },
        hints: {
          select: {
            id: true,
            text: true,
            order: true,
            costPoints: true,
          },
          orderBy: { order: "asc" },
        },
        media: {
          select: {
            id: true,
            type: true,
            url: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            title: true,
            description: true,
            order: true,
            duration: true,
            width: true,
            height: true,
            thumbnail: true,
          },
          orderBy: { order: "asc" },
        },
        sudoku: {
          select: {
            puzzleGrid: true,
            solutionGrid: true,
            difficulty: true,
          },
        },
        jigsaw: {
          select: {
            imageUrl: true,
            gridRows: true,
            gridCols: true,
            snapTolerance: true,
            rotationEnabled: true,
          },
        },
      },
    });

    if (!puzzle) {
      return NextResponse.json(
        { error: "Puzzle not found" },
        { status: 404 }
      );
    }

    // Some Prisma client generations may not include newly added fields
    // (e.g., timeLimitSeconds) in nested select types. Fetch it separately
    // when a sudoku record exists and attach to the payload for the client.
    let outPayload = puzzle as (typeof puzzle & { sudoku?: { timeLimitSeconds?: number | null } });
    if (puzzle?.sudoku) {
      try {
        const extra = await prisma.sudokuPuzzle.findUnique({
          where: { puzzleId: puzzle.id },
          select: ({ timeLimitSeconds: true } as unknown) as Prisma.SudokuPuzzleSelect<any>,
        });
        const extraTl = (extra as any)?.timeLimitSeconds ?? null;
        outPayload = { ...puzzle, sudoku: { ...puzzle.sudoku, timeLimitSeconds: extraTl } };
      } catch (e) {
        console.warn('[PUZZLE FETCH] Failed to fetch sudoku.extra:', e);
      }
    }

    // For wordle puzzles, strip the secret word from the response — validation
    // is done server-side via /api/puzzles/[id]/wordle. Expose only wordLength.
    if ((outPayload as any).puzzleType === "word_crack" && (outPayload as any).data) {
      const wd = { ...((outPayload as any).data as Record<string, unknown>) };
      const secret = String(wd.word ?? "").trim();
      const wordLength = secret.length || Number(wd.wordLength ?? 5);
      delete wd.word;
      wd.wordLength = wordLength;
      outPayload = { ...outPayload, data: wd } as typeof outPayload;
    }

    // Normalize title/description for escape-room puzzles where the metadata is stored on EscapeRoomPuzzle.
    const normalizedTitle = ((outPayload as any)?.title || '').toString().trim() || ((outPayload as any)?.escapeRoom?.roomTitle || '').toString().trim();
    const normalizedDescription = ((outPayload as any)?.description || '').toString().trim() || ((outPayload as any)?.escapeRoom?.roomDescription || '').toString().trim();

    return NextResponse.json({
      ...(outPayload as any),
      title: normalizedTitle,
      description: normalizedDescription,
    });
  } catch (error) {
    console.error("Error fetching puzzle:", error);
    return NextResponse.json(
      { error: "Failed to fetch puzzle" },
      { status: 500 }
    );
  }
}
