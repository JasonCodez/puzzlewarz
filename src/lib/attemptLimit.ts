import prisma from "./prisma";
import { MAX_PUZZLE_ATTEMPTS } from "./puzzleConstants";

export { MAX_PUZZLE_ATTEMPTS };

export interface AttemptStatus {
  locked: boolean;
  failedAttempts: number;
  attemptsRemaining: number;
}

/**
 * Check whether a user has exhausted their allowed failed attempts for a puzzle.
 * Returns locked=false for already-solved puzzles (solved players are never locked).
 */
export async function getAttemptStatus(
  userId: string,
  puzzleId: string
): Promise<AttemptStatus> {
  const progress = await prisma.userPuzzleProgress.findUnique({
    where: { userId_puzzleId: { userId, puzzleId } },
    select: { solved: true, failedAttempts: true },
  });

  if (!progress || progress.solved) {
    return { locked: false, failedAttempts: 0, attemptsRemaining: MAX_PUZZLE_ATTEMPTS };
  }

  const failedAttempts = progress.failedAttempts;
  return {
    locked: failedAttempts >= MAX_PUZZLE_ATTEMPTS,
    failedAttempts,
    attemptsRemaining: Math.max(0, MAX_PUZZLE_ATTEMPTS - failedAttempts),
  };
}

/**
 * Increment a user's failed attempt count for a puzzle.
 * Returns the new total failedAttempts.
 */
export async function recordFailedAttempt(
  userId: string,
  puzzleId: string
): Promise<number> {
  const result = await prisma.userPuzzleProgress.upsert({
    where: { userId_puzzleId: { userId, puzzleId } },
    create: {
      userId,
      puzzleId,
      failedAttempts: 1,
      attempts: 1,
      lastAttemptAt: new Date(),
    },
    update: {
      failedAttempts: { increment: 1 },
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
    select: { failedAttempts: true },
  });
  return result.failedAttempts;
}
