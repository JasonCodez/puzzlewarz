/**
 * fix-bot-solves.ts
 * Finds bot users with suspiciously round/maxed solve counts and
 * trims them to more realistic, varied numbers.
 *
 * Run:  npx tsx scripts/fix-bot-solves.ts
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

async function main() {
  console.log("🔍 Scanning bot puzzle solve counts...");

  const totalPuzzles = await prisma.puzzle.count({ where: { isActive: true } });
  console.log(`  Total active puzzles: ${totalPuzzles}`);

  // Find all bots grouped by solve count
  // Any bot with >= 85% of puzzles solved looks suspicious (too complete)
  const threshold = Math.floor(totalPuzzles * 0.85);
  console.log(`  Threshold for 'too many solves': ${threshold} (85% = ${threshold})`);

  // Get all bot IDs
  const allBots = await prisma.user.findMany({
    where: { isBot: true },
    select: { id: true, totalPoints: true },
  });
  const botIds = allBots.map(b => b.id);

  // Count solves per bot (only bots over threshold)
  const progressCounts = await prisma.userPuzzleProgress.groupBy({
    by: ["userId"],
    where: { userId: { in: botIds }, solved: true },
    _count: { id: true },
    having: { id: { _count: { gte: threshold } } },
  });

  console.log(`  Found ${progressCounts.length} bots with ${threshold}+ solves`);

  if (progressCounts.length === 0) {
    console.log("  Nothing to fix.");
    return;
  }

  // Map totalPoints for these users
  const pointsMap = new Map(allBots.map(b => [b.id, b.totalPoints]));

  let totalDeleted = 0;

  for (const row of progressCounts) {
    const userId = row.userId;
    const currentSolves = row._count.id;
    const points = pointsMap.get(userId) ?? 5000;

    // Calculate a realistic target based on points
    // Tier breakdown:
    //   < 5000 pts  → 20-60 solves
    //   5k-15k      → 40-120 solves
    //   15k-40k     → 80-200 solves
    //   40k-80k     → 150-260 solves (can be high but not 100%)
    //   80k+        → 200-280 solves
    let targetMin: number, targetMax: number;
    if (points < 5000)       { targetMin = 20;  targetMax = 60;  }
    else if (points < 15000) { targetMin = 40;  targetMax = 120; }
    else if (points < 40000) { targetMin = 80;  targetMax = 200; }
    else if (points < 80000) { targetMin = 150; targetMax = 260; }
    else                      { targetMin = 200; targetMax = 280; }

    // Cap target at 95% of puzzles max
    const hardMax = Math.floor(totalPuzzles * 0.95);
    targetMax = Math.min(targetMax, hardMax);
    targetMin = Math.min(targetMin, targetMax);

    const target = randInt(targetMin, targetMax);

    if (target >= currentSolves) continue; // already fine

    const toDelete = currentSolves - target;

    // Fetch all progress IDs for this user, pick random ones to delete
    const allProgress = await prisma.userPuzzleProgress.findMany({
      where: { userId, solved: true },
      select: { id: true },
      orderBy: { solvedAt: "asc" }, // delete oldest solves first (more realistic churn)
    });

    // Delete from the oldest end, but with slight randomisation
    // (shuffle bottom 60% then take toDelete from that pool)
    const shufflePool = allProgress.slice(0, Math.floor(allProgress.length * 0.7));
    const shuffled = shufflePool.sort(() => Math.random() - 0.5);
    const idsToDelete = shuffled.slice(0, toDelete).map(p => p.id);

    if (idsToDelete.length > 0) {
      await prisma.userPuzzleProgress.deleteMany({
        where: { id: { in: idsToDelete } },
      });
      totalDeleted += idsToDelete.length;
      process.stdout.write(`\r  Trimmed ${progressCounts.indexOf(row) + 1}/${progressCounts.length} users (deleted ${totalDeleted} rows so far)`);
    }
  }

  console.log(`\n\n✅ Done. Deleted ${totalDeleted} excess progress records.`);

  // Verify
  const newCounts = await prisma.userPuzzleProgress.groupBy({
    by: ["userId"],
    where: { userId: { in: botIds }, solved: true },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const max  = newCounts[0]?._count.id ?? 0;
  const min  = newCounts[newCounts.length - 1]?._count.id ?? 0;
  const avg  = newCounts.length > 0
    ? Math.round(newCounts.reduce((s, r) => s + r._count.id, 0) / newCounts.length)
    : 0;
  const atMax = newCounts.filter(r => r._count.id >= totalPuzzles).length;

  console.log(`\n  Solve count distribution across bots:`);
  console.log(`    Max: ${max}  |  Min: ${min}  |  Avg: ${avg}`);
  console.log(`    Bots with ALL puzzles solved: ${atMax} (target: 0)`);

  // Distribution buckets
  const buckets = [
    { label: "0",        min: 0,   max: 0   },
    { label: "1-10",     min: 1,   max: 10  },
    { label: "11-30",    min: 11,  max: 30  },
    { label: "31-75",    min: 31,  max: 75  },
    { label: "76-150",   min: 76,  max: 150 },
    { label: "151-220",  min: 151, max: 220 },
    { label: "221-280",  min: 221, max: 280 },
    { label: "281+",     min: 281, max: 9999},
  ];

  // Count bots with 0 solves (not in groupBy result)
  const botsWithSolves = new Set(newCounts.map(r => r.userId));
  const botsWithZero   = botIds.filter(id => !botsWithSolves.has(id)).length;

  for (const b of buckets) {
    const count = b.label === "0"
      ? botsWithZero
      : newCounts.filter(r => r._count.id >= b.min && r._count.id <= b.max).length;
    const bar = "█".repeat(Math.round(count / 10));
    console.log(`    ${b.label.padEnd(8)} ${String(count).padStart(4)}  ${bar}`);
  }
}

main()
  .catch(e => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
