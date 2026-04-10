import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getCrimeCaseData, sanitizeCrimeCaseForClient, validateAccusation } from '@/lib/crimeCase';

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
    if (puzzle.puzzleType !== 'crime_rpg') {
      return NextResponse.json({ error: 'Not a crime RPG puzzle' }, { status: 400 });
    }

    const caseData = getCrimeCaseData(puzzle.data);
    if (!caseData) {
      return NextResponse.json(
        { error: 'Crime case is not configured — add a crimeCase JSON block in the admin puzzle editor.' },
        { status: 500 }
      );
    }

    // Check whether this player has already submitted a correct accusation
    const solvedSubmission = await prisma.puzzleSubmission.findFirst({
      where: { puzzleId, userId: user.id, isCorrect: true },
      select: { id: true, submittedAt: true },
    });

    // Find their last incorrect accusation so we can return partial-score feedback
    const lastBadSubmission = await prisma.puzzleSubmission.findFirst({
      where: { puzzleId, userId: user.id, isCorrect: false },
      orderBy: { submittedAt: 'desc' },
      select: { feedback: true, submittedAt: true },
    });

    let lastPartialScore = null;
    if (lastBadSubmission?.feedback) {
      try {
        lastPartialScore = JSON.parse(lastBadSubmission.feedback);
      } catch {
        // ignore malformed feedback
      }
    }

    const clientData = sanitizeCrimeCaseForClient(caseData);

    return NextResponse.json({
      puzzleId,
      puzzle: clientData,
      solved: Boolean(solvedSubmission),
      solvedAt: solvedSubmission?.submittedAt ?? null,
      lastPartialScore,
      retentionUnlock: solvedSubmission ? (caseData.retentionUnlock ?? null) : null,
    });
  } catch (e) {
    console.error('[crime/state] Failed:', e);
    return NextResponse.json({ error: 'Failed to load crime case state' }, { status: 500 });
  }
}
