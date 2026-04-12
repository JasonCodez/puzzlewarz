import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  // Show admin account balances
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true, email: true, name: true, totalPoints: true, purchasedPoints: true },
  });

  for (const u of admins) {
    const earned = u.totalPoints - u.purchasedPoints;
    console.log(`  ${u.name ?? u.email}: totalPoints=${u.totalPoints}, purchasedPoints=${u.purchasedPoints}, earned=${earned}`);
  }

  // Fix: reset purchasedPoints to 0 for any admin where it exceeds totalPoints
  for (const u of admins) {
    if (u.purchasedPoints > u.totalPoints) {
      await prisma.user.update({
        where: { id: u.id },
        data: { purchasedPoints: 0 },
      });
      console.log(`  Fixed purchasedPoints → 0 for ${u.name ?? u.email}`);
    }
  }

  // Also clamp totalPoints < 0 just in case
  const clamped = await prisma.user.updateMany({
    where: { totalPoints: { lt: 0 } },
    data: { totalPoints: 0 },
  });
  if (clamped.count > 0) console.log(`Clamped ${clamped.count} negative totalPoints to 0.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
