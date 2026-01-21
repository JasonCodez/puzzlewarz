import { PrismaClient } from '@prisma/client';
import path from 'path';
import { config } from 'dotenv';

// load env files like the seed script does
config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  const puzzle = await prisma.puzzle.findFirst({ where: { title: 'Seed: The Detective Office' } });
  if (!puzzle) {
    console.log('Seed puzzle not found');
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log('id:', puzzle.id);
  console.log('title:', puzzle.title);
  console.log('puzzleType:', puzzle.puzzleType);
  console.log('content:', puzzle.content);
  // If the seeded puzzle isn't marked as an escape room, update it so the UI renders the escape-room component.
  if (puzzle.puzzleType !== 'escape_room') {
    console.log('Updating puzzleType -> escape_room');
    await prisma.puzzle.update({ where: { id: puzzle.id }, data: { puzzleType: 'escape_room' } });
    console.log('Updated.');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
