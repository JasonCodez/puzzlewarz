import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  getGridlockFileData,
  validateGridlockAnswer,
  validateLawDeclaration,
  calcGridlockRank,
} from '@/lib/gridlockFile';
import type { GridCellValue, RuleFamily, RuleAxis } from '@/lib/gridlockFile';

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
    if (puzzle.puzzleType !== 'gridlock_file') {
      return NextResponse.json({ error: 'Not a Gridlock File puzzle' }, { status: 400 });
    }

    const fileData = getGridlockFileData(puzzle.data);
    if (!fileData) {
      return NextResponse.json({ error: 'Gridlock File is not configured' }, { status: 500 });
    }

    const body = await req.json();
    const {
      answers,
      declaredFamily,
      declaredAxis,
      elapsedSeconds = 0,
    } = body as {
      answers: GridCellValue[];
      declaredFamily?: RuleFamily;
      declaredAxis?: RuleAxis;
      elapsedSeconds?: number;
    };

    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: 'Missing answers array' }, { status: 400 });
    }

    // ── Validate answer (ALWAYS determines win/loss) ──────────────────────────
    const answerResult = validateGridlockAnswer(fileData, answers);

    // ── Validate Law Declaration (BONUS ONLY — never blocks correct answer) ──
    let lawResult: string = 'not-declared';
    if (declaredFamily && declaredAxis) {
      lawResult = validateLawDeclaration(fileData, declaredFamily, declaredAxis);
    }

    const prevAttempts = await prisma.puzzleSubmission.count({
      where: { puzzleId, userId: user.id },
    });
    const hintsUsed = await prisma.hintUsage.count({
      where: { userId: user.id, hint: { puzzleId } },
    });

    const submissionCount = prevAttempts + 1;
    const lawCorrect = lawResult === 'confirmed' || lawResult === 'alternate';
    const rank = calcGridlockRank(submissionCount, hintsUsed, lawCorrect);

    const feedbackJson = JSON.stringify({
      answerResult,
      lawResult,
      submittedAnswers: answers,
    });

    if (answerResult.correct) {
      // ── Compute streak before transaction ──────────────────────────────────
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today.getTime() - 86_400_000);
      const twoDaysAgo = new Date(today.getTime() - 2 * 86_400_000);

      const [existingStreak, userProtection] = await Promise.all([
        prisma.userStreak.findUnique({
          where: { userId: user.id },
          select: { currentStreak: true, longestStreak: true, lastSolveDate: true },
        }),
        prisma.user.findUnique({
          where: { id: user.id },
          select: { streakShields: true },
        }),
      ]);

      let shieldConsumed = false;
      let newStreakCount = 1;

      if (existingStreak?.lastSolveDate) {
        const last = new Date(existingStreak.lastSolveDate);
        last.setHours(0, 0, 0, 0);
        if (last.getTime() === yesterday.getTime()) {
          // Consecutive day — normal increment
          newStreakCount = (existingStreak.currentStreak ?? 0) + 1;
        } else if (last.getTime() === today.getTime()) {
          // Already solved today — no change
          newStreakCount = existingStreak.currentStreak ?? 1;
        } else if (last.getTime() === twoDaysAgo.getTime()) {
          // Missed exactly 1 day — shield protects the streak
          if ((userProtection?.streakShields ?? 0) > 0) {
            shieldConsumed = true;
            newStreakCount = (existingStreak.currentStreak ?? 0) + 1;
          }
          // else: no shield → resets to 1
        }
        // Missed 2+ days → resets to 1 (no protection covers multi-day gaps)
      }
      const newLongest = Math.max(newStreakCount, existingStreak?.longestStreak ?? 0);

      // Arc completion bonus XP (Day 7 = full arc done)
      const arcXpBonus = fileData.arcDay === 7 ? 240 : 0;
      const baseXp = typeof puzzle.xpReward === 'number' ? puzzle.xpReward : 100;

      // Consecutive daily solve streak bonus: day N = N*50 pts, N*25 XP
      const streakBonusPoints = newStreakCount * 50;
      const streakBonusXp = newStreakCount * 25;

      const totalXp = baseXp + arcXpBonus + streakBonusXp;

      await prisma.$transaction(async (tx) => {
        await tx.puzzleSubmission.create({
          data: {
            puzzleId,
            userId: user.id,
            answer: `GRIDLOCK:${answers.join('|')}`,
            isCorrect: true,
            feedback: feedbackJson,
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

        await tx.user.update({
          where: { id: user.id },
          data: {
            xp: { increment: totalXp },
            totalPoints: { increment: 100 + streakBonusPoints },
            ...(shieldConsumed ? { streakShields: { decrement: 1 } } : {}),
          },
        });

        await tx.userStreak.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            currentStreak: newStreakCount,
            longestStreak: newLongest,
            lastSolveDate: new Date(),
            streakStartDate: new Date(),
          },
          update: {
            currentStreak: newStreakCount,
            longestStreak: newLongest,
            lastSolveDate: new Date(),
          },
        });

        await tx.gridlockSolve.create({
          data: {
            puzzleId,
            userId: user.id,
            rank,
            elapsedSeconds,
            submissionCount,
          },
        });
      });

      // Award arc completion achievement when Day 7 is solved (idempotent)
      let arcAchievement: { id: string; title: string; description: string; icon: string; rarity: string } | null = null;
      if (fileData.arcDay === 7) {
        const achievement = await prisma.achievement.findUnique({
          where: { name: 'gridlock_arc_complete' },
          select: { id: true, title: true, description: true, icon: true, rarity: true },
        });
        if (achievement) {
          const hasIt = await prisma.userAchievement.findUnique({
            where: { userId_achievementId: { userId: user.id, achievementId: achievement.id } },
          });
          if (!hasIt) {
            await prisma.userAchievement.create({
              data: { userId: user.id, achievementId: achievement.id },
            });
            arcAchievement = achievement;
          }
        }
      }

      return NextResponse.json({
        correct: true,
        answerResult,
        lawResult,
        submissionCount,
        rank,
        streak: newStreakCount,
        streakBonusPoints,
        streakBonusXp,
        arcXpBonus,
        shieldConsumed,
        ruleExplanation: fileData.ruleExplanation,
        retentionUnlock: fileData.retentionUnlock ?? null,
        arcDay: fileData.arcDay,
        arcNumber: fileData.arcNumber,
        arcAchievement,
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.puzzleSubmission.create({
          data: {
            puzzleId,
            userId: user.id,
            answer: `GRIDLOCK:${answers.join('|')}`,
            isCorrect: false,
            feedback: feedbackJson,
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
          update: { attempts: { increment: 1 } },
        });
      });

      // Give partial credit feedback: how many cells were correct
      const partialHint = answerResult.totalMissing > 1
        ? `${answerResult.correctCount} of ${answerResult.totalMissing} values correct.`
        : null;

      return NextResponse.json({
        correct: false,
        answerResult,
        lawResult,
        partialHint,
        submissionCount,
        rank,
      });
    }
  } catch (e) {
    console.error('[gridlock/submit] Failed:', e);
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 });
  }
}
