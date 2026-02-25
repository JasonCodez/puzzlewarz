import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });
  return user?.role === "admin" ? session : null;
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
    const message = error instanceof Error ? error.message : "Failed to delete puzzle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
