import path from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  const puzzle = await prisma.puzzle.findFirst({ where: { title: 'Seed: The Detective Office' } });
  if (!puzzle) {
    console.error('Seed puzzle not found');
    await prisma.$disconnect();
    process.exit(1);
  }

  const escapeRoom = await prisma.escapeRoomPuzzle.findUnique({ where: { puzzleId: puzzle.id } });
  if (!escapeRoom) {
    console.error('EscapeRoomPuzzle not found for puzzle');
    await prisma.$disconnect();
    process.exit(1);
  }

  const existing = await prisma.escapeStage.findMany({ where: { escapeRoomId: escapeRoom.id } });
  if (existing.length > 0) {
    console.log('Escape stages already exist, skipping creation.');
    await prisma.$disconnect();
    return;
  }

  await prisma.escapeStage.create({
    data: {
      escapeRoomId: escapeRoom.id,
      order: 1,
      title: 'Find the Key',
      description: 'Search the desk and pick up the golden key.',
      puzzleType: 'text',
      puzzleData: JSON.stringify({}),
      correctAnswer: 'golden_key',
      hints: JSON.stringify(['Look under the blotter on the desk.']),
    },
  });

  console.log('Created escape stage for seed escape room.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
