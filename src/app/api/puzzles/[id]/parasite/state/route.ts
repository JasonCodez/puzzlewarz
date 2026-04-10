import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getParasiteCodeData, sanitizeParasiteForClient, calcRank } from '@/lib/parasiteCode';

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
      select: { id: true },
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
    if (puzzle.puzzleType !== 'parasite_code') {
      return NextResponse.json({ error: 'Not a Parasite Code puzzle' }, { status: 400 });
    }

    const caseData = getParasiteCodeData(puzzle.data);
    if (!caseData) {
      return NextResponse.json(
        { error: 'Parasite Code case is not configured — add a parasiteCode JSON block in the admin puzzle editor.' },
        { status: 500 }
      );
    }

    // Check whether this player has already submitted a correct quarantine
    const solvedSubmission = await prisma.puzzleSubmission.findFirst({
      where: { puzzleId, userId: user.id, isCorrect: true },
      select: { id: true, submittedAt: true },
    });

    // Count all submissions so far
    const submissionCount = await prisma.puzzleSubmission.count({
      where: { puzzleId, userId: user.id },
    });

    // Find their last incorrect feedback
    const lastBadSubmission = await prisma.puzzleSubmission.findFirst({
      where: { puzzleId, userId: user.id, isCorrect: false },
      orderBy: { submittedAt: 'desc' },
      select: { feedback: true, submittedAt: true },
    });

    let lastFeedback: string | null = null;
    if (lastBadSubmission?.feedback) {
      lastFeedback = lastBadSubmission.feedback;
    }

    const clientData = sanitizeParasiteForClient(caseData);

    return NextResponse.json({
      puzzleId,
      puzzle: clientData,
      solved: Boolean(solvedSubmission),
      solvedAt: solvedSubmission?.submittedAt ?? null,
      submissionCount,
      rank: calcRank(submissionCount),
      lastFeedback,
      activationCondition: solvedSubmission ? caseData.activationCondition : null,
      retentionUnlock: solvedSubmission ? (caseData.retentionUnlock ?? null) : null,
    });
  } catch (e) {
    console.error('[parasite/state] Failed:', e);
    return NextResponse.json({ error: 'Failed to load Parasite Code state' }, { status: 500 });
  }
}
