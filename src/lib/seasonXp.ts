import prisma from "@/lib/prisma";

/**
 * Increment the user's season XP on their active season pass.
 * Also auto-advances currentTier based on the tiers' xpRequired thresholds.
 * No-op if there's no active season or the user has no pass.
 */
export async function awardSeasonXp(userId: string, xpGain: number) {
  const now = new Date();

  const userPass = await prisma.userSeasonPass.findFirst({
    where: {
      userId,
      season: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    },
    include: { season: { include: { tiers: { orderBy: { tierNumber: "asc" } } } } },
  });

  if (!userPass) return;

  const newSeasonXp = userPass.seasonXp + xpGain;

  // Calculate new current tier
  let newTier = 0;
  for (const tier of userPass.season.tiers) {
    if (newSeasonXp >= tier.xpRequired) {
      newTier = tier.tierNumber;
    } else {
      break;
    }
  }

  await prisma.userSeasonPass.update({
    where: { id: userPass.id },
    data: { seasonXp: newSeasonXp, currentTier: newTier },
  });
}
