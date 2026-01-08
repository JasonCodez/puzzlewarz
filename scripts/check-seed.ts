import { PrismaClient } from '@prisma/client';

(async () => {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.achievement.count();
    console.log('achievements count:', count);
  } catch (e) {
    console.error('error checking achievements count:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
