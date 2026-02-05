import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getDetectiveCaseData, isDetectiveCaseAnswerCorrect } from '@/lib/detectiveCase';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await request.json().catch(() => null);
    const stageId = body?.stageId;
    const answer = body?.answer;

    if (typeof stageId !== 'string' || typeof answer !== 'string' || !stageId.trim() || !answer.trim()) {
      return NextResponse.json({ error: 'Missing stageId or answer' }, { status: 400 });
    }

    const puzzle = await prisma.puzzle.findUnique({ where: { id: puzzleId }, select: { id: true, puzzleType: true, data: true } });
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

    const existingIncorrect = await prisma.puzzleSubmission.findFirst({
      where: { puzzleId, userId: user.id, isCorrect: false },
      select: { id: true },
    });

    if (existingIncorrect) {
      return NextResponse.json({ error: 'Case locked', locked: true, lockedReason: 'incorrect_submission' }, { status: 403 });
    }

    const correctCount = await prisma.puzzleSubmission.count({
      where: { puzzleId, userId: user.id, isCorrect: true },
    });

    if (correctCount >= dc.stages.length) {
      return NextResponse.json({ correct: true, solved: true });
    }

    const expectedStage = dc.stages[correctCount];
    if (!expectedStage || expectedStage.id !== stageId) {
      return NextResponse.json({ error: 'Invalid stage submission' }, { status: 400 });
    }

    // Ensure a progress row exists.
    const progress = await prisma.userPuzzleProgress.upsert({
      where: { userId_puzzleId: { userId: user.id, puzzleId } },
      create: { userId: user.id, puzzleId },
      update: {},
      select: { id: true, solved: true },
    });

    if (progress.solved) {
      return NextResponse.json({ correct: true, solved: true });
    }

    const correct = isDetectiveCaseAnswerCorrect(expectedStage, answer);

    await prisma.puzzleSubmission.create({
      data: {
        puzzleId,
        userId: user.id,
        answer: JSON.stringify({ stageId, answer }),
        isCorrect: correct,
        feedback: correct ? 'Stage cleared.' : 'Incorrect. Case closed.',
      },
    });

    // Increment attempts and set lastAttemptAt.
    await prisma.userPuzzleProgress.update({
      where: { userId_puzzleId: { userId: user.id, puzzleId } },
      data: {
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    if (!correct) {
      return NextResponse.json({ correct: false, locked: true, lockedReason: 'incorrect_submission' });
    }

    const newCorrectCount = correctCount + 1;
    const solvedNow = newCorrectCount >= dc.stages.length;

    if (solvedNow) {
      // Mark solved and award points once.
      await prisma.userPuzzleProgress.update({
        where: { userId_puzzleId: { userId: user.id, puzzleId } },
        data: {
          solved: true,
          solvedAt: new Date(),
          successfulAttempts: { increment: 1 },
        },
      });

      try {
        const puzzleRecord = await prisma.puzzle.findUnique({ where: { id: puzzleId }, include: { solutions: true, parts: true } });
        let awardPoints = 100;
        if (puzzleRecord) {
          if (puzzleRecord.solutions && puzzleRecord.solutions.length > 0) {
            awardPoints = puzzleRecord.solutions[0].points ?? awardPoints;
          } else if (puzzleRecord.parts && puzzleRecord.parts.length > 0) {
            awardPoints =
              puzzleRecord.parts.reduce((sum: number, part: { pointsValue?: number | null }) => sum + (part.pointsValue ?? 0), 0) || awardPoints;
          }
        }

        await prisma.userPuzzleProgress.update({
          where: { userId_puzzleId: { userId: user.id, puzzleId } },
          data: { pointsEarned: { increment: awardPoints } },
        });

        const existingLeaderboard = await prisma.globalLeaderboard.findFirst({ where: { userId: user.id } });
        if (existingLeaderboard) {
          await prisma.globalLeaderboard.update({ where: { id: existingLeaderboard.id }, data: { totalPoints: { increment: awardPoints } } });
        } else {
          await prisma.globalLeaderboard.create({ data: { userId: user.id, totalPoints: awardPoints } });
        }
      } catch (err) {
        console.error('[detective/submit] Failed to award points:', err);
      }

      return NextResponse.json({ correct: true, solved: true });
    }

    return NextResponse.json({ correct: true, solved: false, nextStageIndex: newCorrectCount });
  } catch (e) {
    console.error('[detective/submit] Failed:', e);
    return NextResponse.json({ error: 'Failed to submit detective case answer' }, { status: 500 });
  }
}
