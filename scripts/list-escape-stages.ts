import path from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  const stages = await prisma.escapeStage.findMany({ take: 50 });
  console.log('escape stages count:', stages.length);
  for (const s of stages) {
    console.log({ id: s.id, escapeRoomId: s.escapeRoomId, order: s.order, title: s.title, correctAnswer: s.correctAnswer });
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
