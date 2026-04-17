import prisma from "./prisma";
import { MAX_PUZZLE_ATTEMPTS } from "./puzzleConstants";

export { MAX_PUZZLE_ATTEMPTS };

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
