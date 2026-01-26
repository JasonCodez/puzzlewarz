import prisma from '../src/lib/prisma';

async function main() {
  console.log('Creating test team puzzle...');

  // Ensure we have a category to satisfy the foreign key
  let category = await prisma.puzzleCategory.findFirst();
  if (!category) {
    category = await prisma.puzzleCategory.create({ data: { name: 'Uncategorized' } });
    console.log('Created fallback category id=', category.id);
  }

  const puzzle = await prisma.puzzle.create({
    data: {
      title: 'Team Test Puzzle (4 players)',
      description: 'Automated test puzzle for lobby flow — requires exactly 4 players.',
      content: 'Test puzzle used to validate lobby and start flow.',
      categoryId: category.id,
      isTeamPuzzle: true,
      minTeamSize: 4,
      puzzleType: 'team',
      parts: {
        create: [
          { title: 'Part 1', content: 'Part 1 content', order: 0 },
          { title: 'Part 2', content: 'Part 2 content', order: 1 },
          { title: 'Part 3', content: 'Part 3 content', order: 2 },
          { title: 'Part 4', content: 'Part 4 content', order: 3 },
        ],
      },
    },
    include: { parts: true },
  });

  console.log('Created puzzle id=', puzzle.id);
}

main()
  .catch((e) => {
    console.error('Script error:', e?.stack || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
