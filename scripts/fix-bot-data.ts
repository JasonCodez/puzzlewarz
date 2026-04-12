/**
 * fix-bot-data.ts
 * Finds bots whose solved-puzzle count is too low relative to their totalPoints
 * and backfills the missing UserPuzzleProgress rows.
 *
 * Run:  npx tsx scripts/fix-bot-data.ts
 */

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

/** Minimum expected solve count for a given points total (mirrors fix-bot-solves thresholds). */
function expectedSolveRange(points: number): { min: number; max: number } {
  if (points < 500)        return { min: 0,   max: 3   };
  if (points < 5_000)      return { min: 15,  max: 60  };
  if (points < 15_000)     return { min: 40,  max: 120 };
  if (points < 40_000)     return { min: 80,  max: 200 };
  if (points < 80_000)     return { min: 150, max: 260 };
  return                          { min: 200, max: 280 };
}

async function main() {
  console.log("🔍 Scanning for bots with too few puzzle solves...");

  const allPuzzles = await prisma.puzzle.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const totalPuzzles = allPuzzles.length;
  console.log(`  Active puzzles: ${totalPuzzles}`);

  const allBots = await prisma.user.findMany({
    where: { isBot: true },
    select: { id: true, totalPoints: true, createdAt: true },
  });
  console.log(`  Total bots: ${allBots.length}`);

  // Get current solve count per bot (only solved=true rows)
  const solveCounts = await prisma.userPuzzleProgress.groupBy({
    by: ["userId"],
    where: { userId: { in: allBots.map(b => b.id) }, solved: true },
    _count: { id: true },
  });
  const solveCountMap = new Map(solveCounts.map(r => [r.userId, r._count.id]));

  // Get existing puzzle IDs per bot so we don't duplicate
  // (load lazily per bot during the fix loop to keep memory reasonable)

  // Determine which bots need fixing
  const toFix = allBots.filter(bot => {
    const current = solveCountMap.get(bot.id) ?? 0;
    const { min } = expectedSolveRange(bot.totalPoints);
    return current < min;
  });

  console.log(`  Bots needing more progress: ${toFix.length}`);

  if (toFix.length === 0) {
    console.log("  ✅ Nothing to fix.");
    return;
  }

  const allPuzzleIds = allPuzzles.map(p => p.id);

  let totalInserted = 0;
  const FLUSH = 2000;
  let progressRows: {
    userId: string;
    puzzleId: string;
    solved: boolean;
    solvedAt: Date;
    attempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    pointsEarned: number;
    completionPercentage: number;
    viewedAt: Date;
    updatedAt: Date;
  }[] = [];

  for (let i = 0; i < toFix.length; i++) {
    const bot = toFix[i];
    const current = solveCountMap.get(bot.id) ?? 0;
    const { min, max } = expectedSolveRange(bot.totalPoints);
    const hardMax = Math.floor(totalPuzzles * 0.92);
    const clampedMax = Math.min(max, hardMax);
    const target = randInt(Math.max(min, current), Math.max(clampedMax, min));
    const needed = target - current;

    if (needed <= 0) continue;

    // Fetch the puzzle IDs this bot has already solved
    const existing = await prisma.userPuzzleProgress.findMany({
      where: { userId: bot.id },
      select: { puzzleId: true },
    });
    const alreadySolved = new Set(existing.map(r => r.puzzleId));

    // Candidate puzzles: anything not yet in their progress
    const candidates = allPuzzleIds.filter(id => !alreadySolved.has(id));

    if (candidates.length === 0) continue;

    // Shuffle and pick the needed count
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const toSolve = shuffled.slice(0, Math.min(needed, shuffled.length));

    const joinedAt = bot.createdAt;
    const msAvailable = Date.now() - joinedAt.getTime();
    const daysAvailable = Math.max(1, Math.floor(msAvailable / 86_400_000));

    for (const puzzleId of toSolve) {
      const solveOffsetDays = randInt(0, daysAvailable);
      const solvedAt = new Date(joinedAt.getTime() + solveOffsetDays * 86_400_000);
      const failedAttempts = randInt(0, 3);

      progressRows.push({
        userId: bot.id,
        puzzleId,
        solved: true,
        solvedAt,
        attempts: 1 + failedAttempts,
        successfulAttempts: 1,
        failedAttempts,
        pointsEarned: Math.round(randFloat(80, 250)),
        completionPercentage: 100,
        viewedAt: new Date(solvedAt.getTime() - randInt(60, 600) * 1000),
        updatedAt: solvedAt,
      });

      if (progressRows.length >= FLUSH) {
        await prisma.userPuzzleProgress.createMany({ data: progressRows, skipDuplicates: true });
        totalInserted += progressRows.length;
        progressRows = [];
        process.stdout.write(`\r  Progress: fixed ${i + 1}/${toFix.length} bots — inserted ${totalInserted} rows`);
      }
    }
  }

  if (progressRows.length > 0) {
    await prisma.userPuzzleProgress.createMany({ data: progressRows, skipDuplicates: true });
    totalInserted += progressRows.length;
  }

  console.log(`\n\n✅ Done. Inserted ${totalInserted} new progress records across ${toFix.length} bots.`);

  // ── Post-fix stats ──────────────────────────────────────────────────────────
  const newCounts = await prisma.userPuzzleProgress.groupBy({
    by: ["userId"],
    where: { userId: { in: allBots.map(b => b.id) }, solved: true },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const max  = newCounts[0]?._count.id ?? 0;
  const min  = newCounts[newCounts.length - 1]?._count.id ?? 0;
  const avg  = newCounts.length > 0
    ? Math.round(newCounts.reduce((s, r) => s + r._count.id, 0) / newCounts.length)
    : 0;

  console.log(`\n  Solve count distribution after fix:`);
  console.log(`    Max: ${max}  |  Min: ${min}  |  Avg: ${avg}`);
  console.log(`    Bots with any solves: ${newCounts.length} / ${allBots.length}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
