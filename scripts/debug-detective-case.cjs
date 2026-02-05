/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const detective = await prisma.puzzle.findMany({
    where: { puzzleType: 'detective_case' },
    select: { id: true, title: true, puzzleType: true, data: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  console.log('Detective cases:', detective.length);
  for (const p of detective) {
    const hasDc = Boolean(p?.data && typeof p.data === 'object' && p.data.detectiveCase);
    console.log(`- ${p.id} :: ${p.title} :: hasDetectiveCase=${hasDc}`);
  }

  const seedByTitle = await prisma.puzzle.findFirst({
    where: { title: 'Seed: The Blackout Ledger', puzzleType: 'detective_case' },
    select: { id: true, title: true, puzzleType: true, data: true },
  });

  console.log('\nSeed puzzle:', seedByTitle ? JSON.stringify(seedByTitle, null, 2) : 'NOT_FOUND');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
