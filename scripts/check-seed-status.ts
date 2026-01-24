import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const achievementCount = await prisma.achievement.count();
  const userCount = await prisma.user.count();
  const puzzleCount = await prisma.puzzle.count();
  const escapeRoomCount = await prisma.escapeRoomPuzzle.count();
  console.log('Achievements:', achievementCount);
  console.log('Users:', userCount);
  console.log('Puzzles:', puzzleCount);
  console.log('Escape Rooms:', escapeRoomCount);
  await prisma.$disconnect();
}

main();
