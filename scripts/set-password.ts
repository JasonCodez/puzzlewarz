import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const pass = process.argv[3];
  if (!email || !pass) {
    console.error("Usage: npx tsx scripts/set-password.ts <email> <password>");
    process.exit(1);
  }
  const hash = await bcrypt.hash(pass, 10);
  await prisma.user.update({ where: { email }, data: { password: hash } });
  console.log(`Password set for ${email}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
