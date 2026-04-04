/**
 * One-time backfill: set User.totalPoints = sum of their existing UserPuzzleProgress.pointsEarned.
 * Run once after the add-user-total-points migration:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-user-total-points.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });

  let updated = 0;
  for (const user of users) {
    const agg = await prisma.userPuzzleProgress.aggregate({
      where: { userId: user.id },
      _sum: { pointsEarned: true },
    });
    const total = agg._sum.pointsEarned ?? 0;
    if (total > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { totalPoints: total },
      });
      updated++;
      console.log(`  User ${user.id}: set totalPoints = ${total}`);
    }
  }

  console.log(`\nDone. Updated ${updated} of ${users.length} users.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
