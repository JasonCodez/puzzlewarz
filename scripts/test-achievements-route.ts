/**
 * Diagnose the 500 error in /api/user/achievements
 * Run: npx tsx scripts/test-achievements-route.ts
 */
import prisma from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true, totalPoints: true, email: true } });
  if (!user) { console.log("No users found"); return; }
  console.log("User:", user.id, "totalPoints:", user.totalPoints);

  console.log("Fetching achievements...");
  const allAchievements = await prisma.achievement.findMany({
    orderBy: [{ rarity: "asc" }, { category: "asc" }],
  });
  console.log("allAchievements count:", allAchievements.length);

  console.log("Fetching puzzleProgress...");
  const userPuzzleProgress = await prisma.userPuzzleProgress.findMany({
    where: { userId: user.id },
    select: { solved: true, attempts: true, puzzleId: true, solvedAt: true },
  });
  console.log("puzzleProgress count:", userPuzzleProgress.length);

  console.log("Fetching referrals...");
  const successfulReferrals = await prisma.userReferral.count({
    where: { referrerId: user.id, refereeFirstPuzzleSolvedAt: { not: null } },
  });
  console.log("successfulReferrals:", successfulReferrals);

  console.log("Fetching userAchievements...");
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId: user.id },
    include: { achievement: true },
  });
  console.log("userAchievements count:", userAchievements.length);

  console.log("All queries succeeded!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
