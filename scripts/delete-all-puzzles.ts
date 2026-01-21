import "dotenv/config";
import fs from "fs";
import path from "path";

async function main() {
  const args = process.argv.slice(2);
  const confirmed = args.includes("--confirm") || process.env.CONFIRM_DELETE === "1";
  if (!confirmed) {
    console.error("This script will permanently delete ALL puzzles and related data. To proceed, pass --confirm or set CONFIRM_DELETE=1.");
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), 'scripts', 'backups');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outDir, `puzzles-backup-${timestamp}.json`);

  console.log('Collecting backup of puzzles and related records (this may take a while)...');

  const prismaModule = await import('../src/lib/prisma');
  // @ts-ignore default export
  const prisma = prismaModule.default || prismaModule;

  const puzzles = await prisma.puzzle.findMany({
    include: {
      hints: true,
      parts: { include: { solutions: true } },
      jigsaw: true,
      sudoku: true,
      escapeRoom: { include: { stages: true, layouts: { include: { hotspots: true, locks: true, triggers: true } }, itemDefinitions: true, playerRoomStates: true, userProgress: true } },
      media: true,
      solutions: true,
      ratings: true,
    },
  });

  fs.writeFileSync(outFile, JSON.stringify({ exportedAt: new Date().toISOString(), count: puzzles.length, puzzles }, null, 2));
  console.log(`Backup written: ${outFile} (${puzzles.length} puzzles)`);

  // Proceed to delete all puzzle records. Database-level cascades should remove related rows.
  console.log('Deleting all puzzles from database (this is irreversible)...');
  const beforeCount = await prisma.puzzle.count();
  const result = await prisma.puzzle.deleteMany({});
  const afterCount = await prisma.puzzle.count();

  console.log(`Deleted puzzles: requested=${beforeCount} deleted=${result.count} remaining=${afterCount}`);

  console.log('Done. If you need to restore, use the backup file created above.');
}

main().catch((e) => {
  console.error('Delete script failed:', e);
  process.exit(2);
});
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deleteAllPuzzles() {
  try {
    console.log("Deleting all puzzles...");

    // Delete related records first
    await prisma.userPuzzleProgress.deleteMany({});
    console.log("✓ Deleted all user puzzle progress");

    await prisma.puzzleHint.deleteMany({});
    console.log("✓ Deleted all puzzle hints");

    await prisma.puzzleRating.deleteMany({});
    console.log("✓ Deleted all puzzle ratings");

    // Delete puzzles
    await prisma.puzzle.deleteMany({});
    console.log("✓ Deleted all puzzles");

    console.log("✅ All puzzles deleted successfully!");
  } catch (error) {
    console.error("❌ Error deleting puzzles:", error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllPuzzles();
