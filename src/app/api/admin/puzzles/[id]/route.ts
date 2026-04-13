import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getGridlockFileData } from "@/lib/gridlockFile";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });
  return user?.role === "admin" ? session : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: puzzleId } = await params;
  const puzzle = await prisma.puzzle.findUnique({
    where: { id: puzzleId },
    include: {
      category: { select: { name: true } },
      hints: { orderBy: { order: "asc" } },
      solutions: { take: 1 },
      jigsaw: true,
      sudoku: true,
      schedule: true,
    },
  });

  if (!puzzle) return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
  return NextResponse.json(puzzle);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: puzzleId } = await params;

  const existing = await prisma.puzzle.findUnique({ where: { id: puzzleId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });

  const body = await req.json();
  const {
    title,
    description,
    content,
    category,
    difficulty,
    correctAnswer,
    pointsReward,
    hints,
    puzzleType,
    puzzleData,
    sudokuGrid,
    sudokuSolution,
    sudokuDifficulty,
    timeLimitSeconds,
    isWarzExclusive,
    gridlockReleaseAt,
  } = body;

  // Get or create category
  let categoryRecord = category
    ? await prisma.puzzleCategory.findFirst({ where: { name: category } })
    : null;
  if (!categoryRecord && category) {
    categoryRecord = await prisma.puzzleCategory.create({ data: { name: category } });
  }

  const validDifficulties = ["easy", "medium", "hard", "expert", "extreme"];
  // For sudoku puzzles use sudokuDifficulty as the source of truth for the badge field.
  const safeDifficulty =
    puzzleType === 'sudoku' && sudokuDifficulty && validDifficulties.includes(sudokuDifficulty.toLowerCase())
      ? sudokuDifficulty.toLowerCase()
      : (difficulty && validDifficulties.includes(difficulty) ? difficulty : "medium");

  const isSpecialType = ["sudoku", "jigsaw", "escape_room", "code_master", "detective_case", "crime_rpg", "gridlock_file", "parasite_code"].includes(puzzleType);

  if (puzzleType === 'gridlock_file') {
    const parsed = getGridlockFileData(puzzleData);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Gridlock File puzzles require puzzleData.gridlockFile with valid grid, correctAnswers, ruleExplanation, and rule metadata' },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update core puzzle fields
    await tx.puzzle.update({
      where: { id: puzzleId },
      data: {
        title: title || "Untitled Puzzle",
        description: description || "",
        content: content || "",
        difficulty: safeDifficulty,
        isWarzExclusive: isWarzExclusive === true,
        ...(categoryRecord ? { categoryId: categoryRecord.id } : {}),
        ...(!isSpecialType ? { riddleAnswer: correctAnswer } : {}),
        ...(([ "escape_room", "code_master", "detective_case", "crack_safe", "word_crack", "word_search", "anagram_blitz", "arg", "blackout", "crime_rpg", "gridlock_file"].includes(puzzleType)) && puzzleData != null
          ? { data: puzzleData }
          : {}),
      },
    });

    // 2. Replace hints
    await tx.puzzleHint.deleteMany({ where: { puzzleId } });
    const filteredHints = Array.isArray(hints) ? hints.filter((h: any) => {
      const text = typeof h === 'string' ? h : h?.text;
      return text?.trim();
    }) : [];
    if (filteredHints.length > 0) {
      await tx.puzzleHint.createMany({
        data: filteredHints.map((h: any, order: number) => {
          const text = typeof h === 'string' ? h : h.text;
          const costPoints = typeof h === 'string' ? 10 : (h.costPoints ?? 10);
          return { puzzleId, text, order, costPoints };
        }),
      });
    }

    // 3. Update solution for simple puzzle types
    if (!isSpecialType && correctAnswer) {
      const sol = await tx.puzzleSolution.findFirst({ where: { puzzleId } });
      if (sol) {
        await tx.puzzleSolution.update({
          where: { id: sol.id },
          data: { answer: correctAnswer, points: pointsReward || 100 },
        });
      } else {
        await tx.puzzleSolution.create({
          data: {
            puzzleId,
            answer: correctAnswer,
            isCorrect: true,
            points: pointsReward || 100,
            ignoreCase: true,
            ignoreWhitespace: false,
          },
        });
      }
    }

    // 4. Update sudoku record if applicable
    if (puzzleType === "sudoku" && sudokuGrid && sudokuSolution) {
      await tx.sudokuPuzzle.upsert({
        where: { puzzleId },
        update: {
          puzzleGrid: JSON.stringify(sudokuGrid),
          solutionGrid: JSON.stringify(sudokuSolution),
          difficulty: sudokuDifficulty || "medium",
          timeLimitSeconds: timeLimitSeconds ?? 900,
        },
        create: {
          puzzleId,
          puzzleGrid: JSON.stringify(sudokuGrid),
          solutionGrid: JSON.stringify(sudokuSolution),
          difficulty: sudokuDifficulty || "medium",
          timeLimitSeconds: timeLimitSeconds ?? 900,
        },
      });
    }

    // 5. Update jigsaw config if applicable
    if (puzzleType === "jigsaw" && puzzleData) {
      await tx.jigsawPuzzle.upsert({
        where: { puzzleId },
        update: {
          gridRows: Number(puzzleData.gridRows) || 3,
          gridCols: Number(puzzleData.gridCols) || 4,
          snapTolerance: Number(puzzleData.snapTolerance) || 12,
          rotationEnabled: Boolean(puzzleData.rotationEnabled),
        },
        create: {
          puzzleId,
          gridRows: Number(puzzleData.gridRows) || 3,
          gridCols: Number(puzzleData.gridCols) || 4,
          snapTolerance: Number(puzzleData.snapTolerance) || 12,
          rotationEnabled: Boolean(puzzleData.rotationEnabled),
        },
      });
    }
  });

  // Upsert PuzzleSchedule.releaseAt for gridlock_file puzzles
  if (puzzleType === 'gridlock_file') {
    const releaseAt = gridlockReleaseAt ? new Date(gridlockReleaseAt) : new Date();
    await prisma.puzzleSchedule.upsert({
      where: { puzzleId },
      create: { puzzleId, releaseAt, schedulingType: 'scheduled' },
      update: { releaseAt },
    });
  }

  const updated = await prisma.puzzle.findUnique({
    where: { id: puzzleId },
    select: { id: true, title: true, puzzleType: true, difficulty: true, isActive: true, createdAt: true, category: { select: { name: true } } },
  });
  return NextResponse.json({ success: true, puzzle: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id: puzzleId } = await params;

    const puzzle = await prisma.puzzle.findUnique({ where: { id: puzzleId }, select: { id: true } });
    if (!puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    // Delete all related records in dependency order before deleting the puzzle itself.
    // Most child models have onDelete:Cascade so they are cleaned up automatically.
    // We only need to manually handle the two cases that lack cascade:
    //   1. Other puzzles that list this one as their requiredPreviousPuzzle
    //   2. ForumPosts whose optional puzzleId points here (no cascade on that relation)
    await prisma.$transaction(async (tx) => {
      // 1. Clear the dependency reference on any puzzle that requires this one
      await tx.puzzle.updateMany({
        where: { requiredPreviousPuzzleId: puzzleId },
        data: { requiredPreviousPuzzleId: null },
      });

      // 2. Detach forum posts (keep the posts, just unlink them from the puzzle)
      await tx.forumPost.updateMany({
        where: { puzzleId },
        data: { puzzleId: null },
      });

      // 3. Delete the puzzle — all cascading relations are cleaned up automatically by the DB
      await tx.puzzle.delete({ where: { id: puzzleId } });
    });

    return NextResponse.json({ success: true, id: puzzleId });
  } catch (error) {
    console.error("[PUZZLE DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete puzzle" }, { status: 500 });
  }
}
