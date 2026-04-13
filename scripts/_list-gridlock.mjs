import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const r = await p.puzzle.findMany({
  where: { puzzleType: 'gridlock_file' },
  select: { id: true, title: true, isActive: true, createdAt: true },
  orderBy: { createdAt: 'desc' },
});
console.log(JSON.stringify(r, null, 2));
await p.$disconnect();
