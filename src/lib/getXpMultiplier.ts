import prisma from "./prisma";

/**
 * Returns the XP (and points) multiplier for a user.
 * - 2 if the user has an active XP boost (xpBoostExpiresAt > now)
 * - 1 otherwise
 */
export async function getXpMultiplier(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xpBoostExpiresAt: true },
  });
  if (!user?.xpBoostExpiresAt) return 1;
  return user.xpBoostExpiresAt.getTime() > Date.now() ? 2 : 1;
}
