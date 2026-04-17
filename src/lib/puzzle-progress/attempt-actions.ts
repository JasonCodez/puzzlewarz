import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { awardSolveRewards } from "./awardSolveRewards";

type AttemptProgress = {
  id: string;
  attempts: number;
  successfulAttempts: number;
  averageTimePerAttempt: number | null;
  solved: boolean;
  sudokuLockedAt: Date | null;
  sudokuStartedAt: Date | null;
  sudokuExpiresAt: Date | null;
};

type AttemptPuzzleRecord = {
  puzzleType: string;
  sudoku?: { solutionGrid?: string | null; timeLimitSeconds?: number | null } | null;
  solutions?: Array<{ points?: number | null }>;
  parts?: Array<{ pointsValue?: number | null }>;
  xpReward?: number | null;
};

export async function logAttempt(
  progress: { id: string; attempts: number; averageTimePerAttempt: number | null },
  durationSeconds: number | undefined,
): Promise<void> {
  const newAttempts = progress.attempts + 1;
  const newAvgTime =
    progress.averageTimePerAttempt && durationSeconds
      ? (progress.averageTimePerAttempt * progress.attempts + durationSeconds) / newAttempts
      : durationSeconds || 0;

  await prisma.userPuzzleProgress.update({
    where: { id: progress.id },
    data: {
      attempts: newAttempts,
      lastAttemptAt: new Date(),
      averageTimePerAttempt: newAvgTime,
    },
  });

  const sessionLog = await prisma.puzzleSessionLog.findFirst({
    where: { progressId: progress.id, sessionEnd: null },
    orderBy: { sessionStart: "desc" },
  });

  if (sessionLog) {
    await prisma.puzzleSessionLog.update({
      where: { id: sessionLog.id },
      data: { attemptMade: true },
    });
  }
}

export async function handleAttemptSuccess(
  progress: AttemptProgress,
  puzzleRecord: AttemptPuzzleRecord,
  submittedGrid: unknown,
  durationSeconds: number | undefined,
  userId: string,
): Promise<NextResponse | null> {
  // Enforce Sudoku time limit server-side
  if (puzzleRecord.puzzleType === "sudoku") {
    const now = new Date();
    if (progress.sudokuLockedAt) {
      return NextResponse.json({ error: "Sudoku puzzle is locked" }, { status: 403 });
    }
    if (!progress.sudokuStartedAt || !progress.sudokuExpiresAt) {
      return NextResponse.json({ error: "Sudoku timer not started" }, { status: 403 });
    }
    if (now.getTime() > progress.sudokuExpiresAt.getTime()) {
      try {
        await prisma.userPuzzleProgress.update({
          where: { id: progress.id },
          data: { sudokuLockedAt: now, sudokuLockReason: "time_limit" },
        });
      } catch { /* ignore */ }
      return NextResponse.json({ error: "Time limit exceeded" }, { status: 403 });
    }
  }

  // Validate submitted Sudoku grid against stored solution
  try {
    if (puzzleRecord.puzzleType === "sudoku") {
      if (!Array.isArray(submittedGrid)) {
        console.warn("[PROGRESS] attempt_success missing grid for sudoku");
        return NextResponse.json({ error: "Missing submitted grid for Sudoku validation" }, { status: 400 });
      }

      let storedSolution: unknown = null;
      try {
        storedSolution = puzzleRecord.sudoku?.solutionGrid
          ? JSON.parse(puzzleRecord.sudoku.solutionGrid)
          : null;
      } catch { storedSolution = null; }

      if (!Array.isArray(storedSolution)) {
        console.error("[PROGRESS] server missing sudoku solution for puzzle");
        return NextResponse.json({ error: "Server missing Sudoku solution" }, { status: 500 });
      }

      const gridsMatch = (() => {
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const s = Number((storedSolution as number[][])[r]?.[c] ?? -1);
            const g = Number((submittedGrid as number[][])[r]?.[c] ?? -1);
            if (Number.isNaN(s) || Number.isNaN(g) || s !== g) return false;
          }
        }
        return true;
      })();

      if (!gridsMatch) {
        console.warn("[PROGRESS] submitted sudoku grid does not match solution");
        return NextResponse.json({ error: "Submitted Sudoku solution does not match" }, { status: 400 });
      }
    }
  } catch (e) {
    console.error("[PROGRESS] error validating sudoku grid", e);
    return NextResponse.json({ error: "Failed to validate submitted solution" }, { status: 500 });
  }

  // Update progress row
  const newAttempts = progress.attempts + 1;
  const newAvgTime =
    progress.averageTimePerAttempt && durationSeconds
      ? (progress.averageTimePerAttempt * progress.attempts + durationSeconds) / newAttempts
      : durationSeconds || 0;

  await prisma.userPuzzleProgress.update({
    where: { id: progress.id },
    data: {
      attempts: newAttempts,
      successfulAttempts: progress.successfulAttempts + 1,
      lastAttemptAt: new Date(),
      averageTimePerAttempt: newAvgTime,
      solved: true,
      solvedAt: new Date(),
    },
  });

  // Mark session log as successful
  const sessionLog = await prisma.puzzleSessionLog.findFirst({
    where: { progressId: progress.id, sessionEnd: null },
    orderBy: { sessionStart: "desc" },
  });

  if (sessionLog) {
    await prisma.puzzleSessionLog.update({
      where: { id: sessionLog.id },
      data: { wasSuccessful: true, attemptMade: true },
    });
  }

  // Check Triple-or-Nothing token (3× rewards on first attempt)
  let tripleActive = false;
  try {
    const tripleUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { tripleOrNothingActive: true },
    });
    tripleActive = !!(tripleUser?.tripleOrNothingActive && progress.attempts === 0);
    if (tripleActive) {
      await prisma.user.update({ where: { id: userId }, data: { tripleOrNothingActive: false } });
    }
  } catch { /* non-critical */ }

  await awardSolveRewards(userId, progress.id, puzzleRecord, tripleActive);

  return null;
}

export async function recordGameLoss(
  progress: { id: string; solved: boolean },
  userId: string,
): Promise<void> {
  if (!progress.solved) {
    await prisma.userPuzzleProgress.update({
      where: { id: progress.id },
      data: { failedAttempts: { increment: 1 }, lastAttemptAt: new Date() },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { tripleOrNothingActive: false },
    });
  }
}
