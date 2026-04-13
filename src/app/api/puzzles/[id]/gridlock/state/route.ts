import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getGridlockFileData, sanitizeGridlockForClient, calcGridlockRank } from '@/lib/gridlockFile';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: puzzleId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, streakShields: true, hintTokens: true, streak: { select: { currentStreak: true } } },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      select: { id: true, puzzleType: true, data: true, title: true },
    });
    if (!puzzle) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
    }
    if (puzzle.puzzleType !== 'gridlock_file') {
      return NextResponse.json({ error: 'Not a Gridlock File puzzle' }, { status: 400 });
    }

    const fileData = getGridlockFileData(puzzle.data);
    if (!fileData) {
      return NextResponse.json(
        { error: 'Gridlock File is not configured — add a gridlockFile JSON block in the admin puzzle editor.' },
        { status: 500 }
      );
    }

    const solvedSubmission = await prisma.puzzleSubmission.findFirst({
      where: { puzzleId, userId: user.id, isCorrect: true },
      select: { id: true, submittedAt: true },
    });

    const submissionCount = await prisma.puzzleSubmission.count({
      where: { puzzleId, userId: user.id },
    });

    const hintsUsed = await prisma.hintUsage.count({
      where: { userId: user.id, hint: { puzzleId } },
    });

    // Return last wrong attempt feedback for UI continuity
    const lastBadSubmission = await prisma.puzzleSubmission.findFirst({
      where: { puzzleId, userId: user.id, isCorrect: false },
      orderBy: { submittedAt: 'desc' },
      select: { feedback: true },
    });

    let lawDeclaredCorrectly = false; // retained for future use
    if (lastBadSubmission?.feedback) {
      try {
        const fb = JSON.parse(lastBadSubmission.feedback);
        lawDeclaredCorrectly = fb.lawResult === 'confirmed' || fb.lawResult === 'alternate';
      } catch { /* ignore */ }
    }

    const rank = calcGridlockRank(submissionCount, hintsUsed);
    const clientData = sanitizeGridlockForClient(fileData);

    return NextResponse.json({
      puzzleId,
      puzzle: clientData,
      solved: Boolean(solvedSubmission),
      solvedAt: solvedSubmission?.submittedAt ?? null,
      submissionCount,
      hintsUsed,
      rank,
      ruleExplanation: solvedSubmission ? fileData.ruleExplanation : null,
      retentionUnlock: solvedSubmission ? (fileData.retentionUnlock ?? null) : null,
      streakShields: user?.streakShields ?? 0,
      currentStreak: user?.streak?.currentStreak ?? 0,
      hintTokens: user?.hintTokens ?? 0,
    });
  } catch (e) {
    console.error('[gridlock/state] Failed:', e);
    return NextResponse.json({ error: 'Failed to load Gridlock File state' }, { status: 500 });
  }
}
