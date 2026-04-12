/**
 * Sets isHidden = true on the admin account so it is invisible to all other players.
 * Run once: npx tsx scripts/hide-admin.ts
 *
 * To un-hide: npx tsx scripts/hide-admin.ts --unhide
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const unhide = process.argv.includes("--unhide");

  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true, name: true, email: true, isHidden: true },
  });

  if (admins.length === 0) {
    console.log("No admin accounts found.");
    return;
  }

  for (const admin of admins) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { isHidden: !unhide },
    });
    console.log(`${unhide ? "Unhid" : "Hidden"} admin account: ${admin.name ?? admin.email} (${admin.id})`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
