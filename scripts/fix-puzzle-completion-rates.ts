/**
 * fix-puzzle-completion-rates.ts
 *
 * All bot UserPuzzleProgress rows are currently solved=true, making every
 * puzzle show 100% completion rate. This script adds realistic solved=false
 * rows for bots who "attempted but didn't finish", weighted by difficulty.
 *
 * Run:  npx tsx scripts/fix-puzzle-completion-rates.ts
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

/**
 * Target completion rate (solved / total attempts) by difficulty.
 * These are the mid-points; we add ±5% random variance per puzzle.
 */
function targetRate(difficulty: string): number {
  switch (difficulty?.toLowerCase()) {
    case "beginner":
    case "easy":      return 0.78;
    case "medium":    return 0.55;
    case "hard":      return 0.30;
    case "expert":
    case "insane":    return 0.13;
    default:          return 0.55;
  }
}

async function main() {
  console.log("📊 Fixing puzzle completion rates...\n");

  const puzzles = await prisma.puzzle.findMany({
    where: { isActive: true },
    select: { id: true, difficulty: true },
  });
  console.log(`  Puzzles to process: ${puzzles.length}`);

  // All bot IDs
  const allBots = await prisma.user.findMany({
    where: { isBot: true },
    select: { id: true },
  });
  const allBotIds = allBots.map(b => b.id);
  console.log(`  Available bots: ${allBotIds.length}\n`);

  let totalInserted = 0;
  const FLUSH = 3000;
  let rows: {
    userId: string;
    puzzleId: string;
    solved: boolean;
    attempts: number;
    failedAttempts: number;
    successfulAttempts: number;
    completionPercentage: number;
    pointsEarned: number;
    viewedAt: Date;
    updatedAt: Date;
  }[] = [];

  for (let pi = 0; pi < puzzles.length; pi++) {
    const puzzle = puzzles[pi];

    // Current solve count for this puzzle (bot solves only — all are solved=true)
    const solvedCount = await prisma.userPuzzleProgress.count({
      where: { puzzleId: puzzle.id, solved: true },
    });

    if (solvedCount === 0) continue; // nobody solved it yet, skip

    // Bots who already have ANY progress row for this puzzle
    const existing = await prisma.userPuzzleProgress.findMany({
      where: { puzzleId: puzzle.id },
      select: { userId: true },
    });
    const alreadyHas = new Set(existing.map(r => r.userId));
    const candidates = allBotIds.filter(id => !alreadyHas.has(id));

    if (candidates.length === 0) continue;

    // Pick a target rate with ±5% variance
    const base = targetRate(puzzle.difficulty ?? "medium");
    const variance = (Math.random() - 0.5) * 0.10; // ±5%
    const rate = Math.max(0.05, Math.min(0.95, base + variance));

    // How many failed rows do we need?
    // solvedCount / (solvedCount + failedNeeded) = rate
    // failedNeeded = solvedCount * (1 - rate) / rate
    const failedNeeded = Math.round(solvedCount * (1 - rate) / rate);

    if (failedNeeded <= 0) continue;

    const toAdd = Math.min(failedNeeded, candidates.length);

    // Pick a random subset of candidate bots
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, toAdd);

    const now = Date.now();
    const oneYearAgo = now - 365 * 86_400_000;

    for (const botId of chosen) {
      const viewedAt = new Date(randInt(oneYearAgo, now));
      const lastAttemptAt = new Date(viewedAt.getTime() + randInt(60, 1800) * 1000);
      const failedAttempts = randInt(1, 3);
      // Partial completion — harder puzzles abandoned earlier
      const maxPct = base < 0.3 ? 50 : base < 0.55 ? 70 : 85;
      const completionPct = randInt(5, maxPct);

      rows.push({
        userId: botId,
        puzzleId: puzzle.id,
        solved: false,
        attempts: failedAttempts,
        failedAttempts,
        successfulAttempts: 0,
        completionPercentage: completionPct,
        pointsEarned: 0,
        viewedAt,
        updatedAt: lastAttemptAt,
      });

      if (rows.length >= FLUSH) {
        await prisma.userPuzzleProgress.createMany({ data: rows, skipDuplicates: true });
        totalInserted += rows.length;
        rows = [];
      }
    }

    process.stdout.write(`\r  Processed ${pi + 1}/${puzzles.length} puzzles — inserted ${totalInserted} failed rows so far`);
  }

  if (rows.length > 0) {
    await prisma.userPuzzleProgress.createMany({ data: rows, skipDuplicates: true });
    totalInserted += rows.length;
  }

  console.log(`\n\n✅ Inserted ${totalInserted} failed-attempt rows.`);

  // ── Verification ────────────────────────────────────────────────────────────
  console.log("\n📈 Sample completion rates after fix:\n");

  const sample = await prisma.puzzle.findMany({
    where: { isActive: true },
    select: { id: true, difficulty: true },
    take: 20,
  });

  const header = "Difficulty".padEnd(12) + "Solved".padStart(8) + "Attempted".padStart(12) + "Rate".padStart(8);
  console.log("  " + header);
  console.log("  " + "─".repeat(header.length));

  for (const p of sample) {
    const solved   = await prisma.userPuzzleProgress.count({ where: { puzzleId: p.id, solved: true } });
    const total    = await prisma.userPuzzleProgress.count({ where: { puzzleId: p.id } });
    const rate     = total > 0 ? Math.round(solved / total * 100) : 0;
    console.log(
      "  " +
      (p.difficulty ?? "unknown").padEnd(12) +
      String(solved).padStart(8) +
      String(total).padStart(12) +
      `${rate}%`.padStart(8)
    );
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
