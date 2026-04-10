import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getParasiteCodeData, validateQuarantine, calcRank } from '@/lib/parasiteCode';

export async function POST(
  req: NextRequest,
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

    // Don't let already-solved players re-submit
    const alreadySolved = await prisma.puzzleSubmission.findFirst({
      where: { puzzleId, userId: user.id, isCorrect: true },
      select: { id: true },
    });
    if (alreadySolved) {
      return NextResponse.json({ error: 'Already solved', alreadySolved: true }, { status: 400 });
    }

    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      select: { id: true, puzzleType: true, data: true, xpReward: true },
    });
    if (!puzzle) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
    }
    if (puzzle.puzzleType !== 'parasite_code') {
      return NextResponse.json({ error: 'Not a Parasite Code puzzle' }, { status: 400 });
    }

    const caseData = getParasiteCodeData(puzzle.data);
    if (!caseData) {
      return NextResponse.json({ error: 'Parasite Code case is not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { quarantinedIds } = body as { quarantinedIds: string[] };

    if (!Array.isArray(quarantinedIds)) {
      return NextResponse.json({ error: 'Missing quarantinedIds array' }, { status: 400 });
    }

    // Count existing attempts before this one
    const prevAttempts = await prisma.puzzleSubmission.count({
      where: { puzzleId, userId: user.id },
    });

    const result = validateQuarantine(caseData, quarantinedIds);
    const submissionCount = prevAttempts + 1;
    const rank = calcRank(submissionCount);

    if (result.correct) {
      await prisma.$transaction(async (tx) => {
        await tx.puzzleSubmission.create({
          data: {
            puzzleId,
            userId: user.id,
            answer: `PARASITE_QUARANTINE:${quarantinedIds.join(',')}`,
            isCorrect: true,
          },
        });

        await tx.userPuzzleProgress.upsert({
          where: { userId_puzzleId: { userId: user.id, puzzleId } },
          create: {
            userId: user.id,
            puzzleId,
            solved: true,
            solvedAt: new Date(),
            attempts: submissionCount,
            successfulAttempts: 1,
            pointsEarned: 100,
            completionPercentage: 100,
          },
          update: {
            solved: true,
            solvedAt: new Date(),
            successfulAttempts: { increment: 1 },
            attempts: { increment: 1 },
            pointsEarned: 100,
            completionPercentage: 100,
          },
        });

        const xp = typeof puzzle.xpReward === 'number' ? puzzle.xpReward : 100;
        await tx.user.update({
          where: { id: user.id },
          data: { xp: { increment: xp }, totalPoints: { increment: 100 } },
        });
      });

      return NextResponse.json({
        correct: true,
        feedback: result.feedback,
        foundCount: result.foundCount,
        totalParasiteCount: result.totalParasiteCount,
        submissionCount,
        rank,
        activationCondition: caseData.activationCondition,
        retentionUnlock: caseData.retentionUnlock ?? null,
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.puzzleSubmission.create({
          data: {
            puzzleId,
            userId: user.id,
            answer: `PARASITE_QUARANTINE:${quarantinedIds.join(',')}`,
            isCorrect: false,
            feedback: result.feedback,
          },
        });

        await tx.userPuzzleProgress.upsert({
          where: { userId_puzzleId: { userId: user.id, puzzleId } },
          create: {
            userId: user.id,
            puzzleId,
            solved: false,
            attempts: submissionCount,
            successfulAttempts: 0,
            pointsEarned: 0,
            completionPercentage: 0,
          },
          update: {
            attempts: { increment: 1 },
          },
        });
      });

      return NextResponse.json({
        correct: false,
        feedback: result.feedback,
        foundCount: result.foundCount,
        totalParasiteCount: result.totalParasiteCount,
        submissionCount,
        rank,
      });
    }
  } catch (e) {
    console.error('[parasite/submit] Failed:', e);
    return NextResponse.json({ error: 'Failed to submit quarantine' }, { status: 500 });
  }
}
