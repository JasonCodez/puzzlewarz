import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const r = await prisma.puzzle.findFirst({ where: { puzzleType: 'gridlock_file' }, select: { id: true, title: true, isActive: true, data: true } });
console.log('isActive:', r?.isActive);
console.log('full data:');
console.log(JSON.stringify(r?.data, null, 2));
await prisma.$disconnect();
