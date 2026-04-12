import { prisma } from "@/lib/prisma";
import { LEVELS, LevelReward } from "@/lib/levels";

/**
 * Grants any unclaimed level-up rewards for a user.
 *
 * Uses an optimistic-lock updateMany to prevent double-granting in concurrent
 * requests: only the first caller that sees levelRewardClaimed < user.level
 * will succeed and receive the reward.
 *
 * @returns The aggregated reward granted, or null if nothing was owed.
 */
export async function grantLevelReward(userId: string): Promise<LevelReward | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { level: true, levelRewardClaimed: true },
  });

  if (!user) return null;

  const { level, levelRewardClaimed } = user;

  // Collect every level between (claimed+1) and current level that has a reward
  const unclaimedLevels = LEVELS.filter(
    (ld) => ld.level > levelRewardClaimed && ld.level <= level && ld.reward
  );

  if (unclaimedLevels.length === 0) return null;

  // Aggregate all unclaimed rewards into a single total
  let totalPoints = 0;
  let totalHintTokens = 0;
  let totalSkipTokens = 0;

  for (const ld of unclaimedLevels) {
    if (ld.reward) {
      totalPoints      += ld.reward.points      ?? 0;
      totalHintTokens  += ld.reward.hintTokens  ?? 0;
      totalSkipTokens  += ld.reward.skipTokens  ?? 0;
    }
  }

  // Build a human-readable label
  const parts: string[] = [];
  if (totalPoints)     parts.push(`+${totalPoints.toLocaleString()} Points`);
  if (totalHintTokens) parts.push(`${totalHintTokens} Hint Token${totalHintTokens !== 1 ? "s" : ""}`);
  if (totalSkipTokens) parts.push(`${totalSkipTokens} Skip Token${totalSkipTokens !== 1 ? "s" : ""}`);
  const label = parts.join(", ");

  // Atomically claim: only succeeds if levelRewardClaimed is still < level
  const updated = await prisma.user.updateMany({
    where: { id: userId, levelRewardClaimed: { lt: level } },
    data: {
      levelRewardClaimed: level,
      ...(totalPoints      > 0 && { totalPoints:   { increment: totalPoints      } }),
      ...(totalHintTokens  > 0 && { hintTokens:    { increment: totalHintTokens  } }),
      ...(totalSkipTokens  > 0 && { skipTokens:    { increment: totalSkipTokens  } }),
    },
  });

  // Another request already claimed it — no double-grant
  if (updated.count === 0) return null;

  const reward: LevelReward = { label };
  if (totalPoints)     reward.points      = totalPoints;
  if (totalHintTokens) reward.hintTokens  = totalHintTokens;
  if (totalSkipTokens) reward.skipTokens  = totalSkipTokens;

  return reward;
}
