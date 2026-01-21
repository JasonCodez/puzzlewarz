import "dotenv/config";

async function main() {
  const prismaModule = await import('../src/lib/prisma');
  // @ts-ignore
  const prisma = prismaModule.default || prismaModule;

  const total = await prisma.puzzle.count().catch(() => null);
  const puzzles = await prisma.puzzle.findMany({ select: { id: true, title: true, puzzleType: true }, take: 20 }).catch(() => null);
  const escapeCount = await prisma.escapeRoomPuzzle.count().catch(() => null);

  console.log('DB puzzle summary:');
  console.log('  puzzle count:', total);
  console.log('  escape room puzzles:', escapeCount);
  if (Array.isArray(puzzles)) {
    console.log('  sample puzzles:');
    for (const p of puzzles) console.log(`    - ${p.id} (${p.puzzleType}) ${p.title}`);
  } else {
    console.log('  samples: (query failed)');
  }

  // Check backups folder existence
  const fs = await import('fs');
  const path = await import('path');
  const backupsDir = path.join(process.cwd(), 'scripts', 'backups');
  if (fs.existsSync(backupsDir)) {
    const files = fs.readdirSync(backupsDir).filter(f => f.includes('puzzles-backup'));
    console.log('  backups:', files.length ? files.map(f => `scripts/backups/${f}`).join(', ') : 'none');
  } else {
    console.log('  backups: none');
  }
}

main().catch(e => {
  console.error('check script failed', e);
  process.exit(1);
});
