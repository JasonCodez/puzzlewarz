import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getDetectiveCaseData, sanitizeStageForClient } from '@/lib/detectiveCase';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: puzzleId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const puzzle = await prisma.puzzle.findUnique({ where: { id: puzzleId }, select: { id: true, puzzleType: true, data: true, title: true } });
    if (!puzzle) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
    }

    if (puzzle.puzzleType !== 'detective_case') {
      return NextResponse.json({ error: 'Not a detective case puzzle' }, { status: 400 });
    }

    const dc = getDetectiveCaseData(puzzle.data);
    if (!dc) {
      return NextResponse.json({ error: 'Detective case is not configured' }, { status: 500 });
    }

    // Any incorrect submission locks the case forever.
    const anyIncorrect = await prisma.puzzleSubmission.findFirst({
      where: { puzzleId, userId: user.id, isCorrect: false },
      select: { id: true, submittedAt: true },
    });

    const correctCount = await prisma.puzzleSubmission.count({
      where: { puzzleId, userId: user.id, isCorrect: true },
    });

    const solved = !anyIncorrect && correctCount >= dc.stages.length;
    const locked = Boolean(anyIncorrect) && !solved;

    const currentStageIndex = solved ? dc.stages.length : Math.min(correctCount, dc.stages.length - 1);
    const currentStage = solved ? null : dc.stages[currentStageIndex];

    return NextResponse.json({
      puzzleId,
      noirTitle: dc.noirTitle || puzzle.title,
      intro: dc.intro || null,
      totalStages: dc.stages.length,
      solved,
      locked,
      lockedReason: locked ? 'incorrect_submission' : null,
      currentStageIndex,
      stage: currentStage ? sanitizeStageForClient(currentStage) : null,
    });
  } catch (e) {
    console.error('[detective/state] Failed:', e);
    return NextResponse.json({ error: 'Failed to load detective case state' }, { status: 500 });
  }
}
