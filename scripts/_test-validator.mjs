// Test validator logic directly against the real DB data
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const puzzle = await prisma.puzzle.findFirst({ where: { puzzleType: 'gridlock_file', isActive: true }, select: { id: true, data: true } });
await prisma.$disconnect();

const fileData = puzzle.data?.gridlockFile;
const correctAnswers = fileData?.correctAnswers;
console.log('correctAnswers:', correctAnswers);
console.log('correctAnswers[0] type:', typeof correctAnswers?.[0]);

// Simulate what validateGridlockAnswer does
const submittedAnswers = ['9'];
const total = correctAnswers.length;
let correctCount = 0;
for (let i = 0; i < total; i++) {
  const canonical = String(correctAnswers[i]).trim().toUpperCase();
  const submitted = String(submittedAnswers[i] ?? '').trim().toUpperCase();
  console.log(`canonical="${canonical}" submitted="${submitted}" match=${canonical === submitted}`);
  if (canonical === submitted) correctCount++;
}
console.log('correct:', correctCount === total);
