// Test the guest submit API directly
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const puzzle = await prisma.puzzle.findFirst({ where: { puzzleType: 'gridlock_file', isActive: true }, select: { id: true } });
await prisma.$disconnect();

const puzzleId = puzzle.id;
console.log('Testing puzzle ID:', puzzleId);

const res = await fetch(`http://localhost:3000/api/gridlock/guest/${puzzleId}/submit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ answers: ['9'], submissionCount: 1, elapsedSeconds: 30 }),
});

console.log('Status:', res.status);
const data = await res.json();
console.log('Response:', JSON.stringify(data, null, 2));
