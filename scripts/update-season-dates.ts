import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.season.updateMany({
    where: { name: "Season 1 — Ignition" },
    data: { endDate: new Date(Date.UTC(2026, 5, 6)) }, // 2026-06-06
  });
  console.log(`Updated ${updated.count} season(s). New endDate: 2026-06-06`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
