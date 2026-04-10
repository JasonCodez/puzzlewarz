import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const r = await prisma.puzzle.findFirst({ where: { puzzleType: 'gridlock_file' }, select: { id: true, title: true, data: true } });
const g = r?.data?.gridlockFile;
console.log('correctAnswers:', JSON.stringify(g?.correctAnswers));
console.log('grid:');
g?.grid?.forEach((row, ri) => row.forEach((cell, ci) => console.log(`  [${ri}][${ci}] value=${JSON.stringify(cell.value)} isMissing=${cell.isMissing}`)));
await prisma.$disconnect();
