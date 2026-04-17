import prisma from "@/lib/prisma";
import { calcLevel } from "@/lib/levels";
import { awardSeasonXp } from "@/lib/seasonXp";
import { incrementStreak } from "@/lib/streakService";
import { getXpMultiplier } from "@/lib/getXpMultiplier";

type PuzzleRewardInfo = {
  solutions?: Array<{ points?: number | null }>;
  parts?: Array<{ pointsValue?: number | null }>;
  xpReward?: number | null;
} | null;

/**
 * Awards points, XP, streak, and broadcasts the leaderboard update after a
 * puzzle is successfully solved. Each section is wrapped in its own try/catch
 * so a failure in one does not prevent the others from running.
 */
export async function awardSolveRewards(
  userId: string,
  progressId: string,
  puzzleRecord: PuzzleRewardInfo,
  tripleActive: boolean,
): Promise<void> {
  // Award points for solving the puzzle
  try {
    let awardPoints = 100;
    if (puzzleRecord) {
      if (puzzleRecord.solutions && puzzleRecord.solutions.length > 0) {
        awardPoints = puzzleRecord.solutions[0].points ?? awardPoints;
      } else if (puzzleRecord.parts && puzzleRecord.parts.length > 0) {
        // Sum part point values as a fallback for multi-part puzzles
        awardPoints = puzzleRecord.parts.reduce(
          (sum: number, part: { pointsValue?: number | null }) => sum + (part.pointsValue ?? 0),
          0
        ) || awardPoints;
      }
    }

    if (tripleActive) awardPoints *= 3;

    // Update user's progress points
    await prisma.userPuzzleProgress.update({
      where: { id: progressId },
      data: { pointsEarned: { increment: awardPoints } },
    });

    // Update user's persistent total (survives puzzle deletion)
    await prisma.user.update({
      where: { id: userId },
      data: { totalPoints: { increment: awardPoints } },
    });

    // Update or create global leaderboard entry
    const existingLeaderboard = await prisma.globalLeaderboard.findFirst({ where: { userId } });
    if (existingLeaderboard) {
      await prisma.globalLeaderboard.update({
        where: { id: existingLeaderboard.id },
        data: { totalPoints: { increment: awardPoints } },
      });
    } else {
      await prisma.globalLeaderboard.create({ data: { userId, totalPoints: awardPoints } });
    }
  } catch (err) {
    console.error('Failed to award points on puzzle success:', err);
  }

  // ── Award XP and recalculate level/title ──────────────────────────────────
  try {
    const baseXp = puzzleRecord?.xpReward ?? 50;
    const xpMultiplier = await getXpMultiplier(userId);
    const xpGain = baseXp * xpMultiplier * (tripleActive ? 3 : 1);
    const freshUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });
    const newXp = (freshUser?.xp ?? 0) + xpGain;
    const { level, title } = calcLevel(newXp);
    await prisma.user.update({
      where: { id: userId },
      data: { xp: newXp, level, xpTitle: title },
    });
    // Season pass XP
    await awardSeasonXp(userId, xpGain);
  } catch (err) {
    console.error('Failed to award XP on puzzle success:', err);
  }

  // ── Streak ────────────────────────────────────────────────────────────────
  try {
    await incrementStreak(userId);
  } catch (err) {
    console.error('Failed to update streak on puzzle success:', err);
  }

  // ── Real-time leaderboard broadcast ──────────────────────────────────────
  try {
    const socketUrl = process.env.SOCKET_URL;
    if (socketUrl) {
      fetch(`${socketUrl}/emit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-socket-secret': process.env.SOCKET_SECRET ?? '',
        },
        body: JSON.stringify({ event: 'leaderboard:update', payload: { userId } }),
      }).catch(() => {/* non-critical */});
    }
  } catch { /* non-critical */ }
}
