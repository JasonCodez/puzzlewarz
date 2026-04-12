import prisma from "./prisma";

function toDateKey(date: Date): string {
  // YYYY-MM-DD in UTC
  return date.toISOString().slice(0, 10);
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  /** true if the streak was extended/started (not just touched today) */
  extended: boolean;
}

/**
 * Increment the streak for a user on a successful puzzle solve.
 * - If the user already solved something today → no-op (returns current values).
 * - If the user solved something yesterday → extend streak.
 * - Otherwise → reset to 1.
 * Idempotent: safe to call multiple times per day.
 */
export async function incrementStreak(userId: string): Promise<StreakResult> {
  const todayKey = toDateKey(new Date());
  const yesterdayKey = toDateKey(new Date(Date.now() - 86_400_000));

  const existing = await prisma.userStreak.findUnique({ where: { userId } });

  if (existing) {
    const lastKey = existing.lastSolveDate ? toDateKey(existing.lastSolveDate) : null;

    // Already counted today → return as-is
    if (lastKey === todayKey) {
      return {
        currentStreak: existing.currentStreak,
        longestStreak: existing.longestStreak,
        extended: false,
      };
    }

    const breaking = lastKey !== yesterdayKey && lastKey !== null;
    const newStreak = lastKey === yesterdayKey ? existing.currentStreak + 1 : 1;
    const newLongest = Math.max(newStreak, existing.longestStreak);
    const now = new Date();

    await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastSolveDate: now,
        streakStartDate:
          newStreak === 1 ? now : existing.streakStartDate ?? now,
        // Save the streak that just broke so streak recovery can restore it
        ...(breaking ? { lastStreakBeforeBreak: existing.currentStreak } : {}),
      },
    });

    return { currentStreak: newStreak, longestStreak: newLongest, extended: true };
  }

  // First solve ever
  const now = new Date();
  await prisma.userStreak.create({
    data: {
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastSolveDate: now,
      streakStartDate: now,
    },
  });

  return { currentStreak: 1, longestStreak: 1, extended: true };
}
