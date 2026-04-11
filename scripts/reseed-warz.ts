/**
 * reseed-warz.ts
 * Deletes all bot-created warz challenges and re-seeds them using only
 * the approved puzzle types, with realistic per-type completion times.
 *
 * Run:  npx tsx scripts/reseed-warz.ts
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
function pickRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Realistic time ranges per puzzle type (seconds) ──────────────────────────
// These are the only allowed types for Warz challenges.
// "the_witness" maps to the DB puzzleType — adjust if your DB uses a different key.
const WARZ_TYPES: Record<string, { min: number; max: number }> = {
  sudoku:        { min: 90,  max: 900  }, // 1.5–15 min
  crime_rpg:     { min: 180, max: 1200 }, // 3–20 min
  word_crack:    { min: 45,  max: 360  }, // 45s–6 min
  word_search:   { min: 60,  max: 480  }, // 1–8 min
  anagram_blitz: { min: 30,  max: 240  }, // 30s–4 min
  the_witness:   { min: 120, max: 900  }, // 2–15 min
  blackout:      { min: 60,  max: 540  }, // 1–9 min
};

const ALLOWED_TYPES = Object.keys(WARZ_TYPES);

async function main() {
  console.log("⚔️  Re-seeding Warz challenges...\n");

  // ── 1. Get all bot IDs ────────────────────────────────────────────────────
  const allBots = await prisma.user.findMany({
    where: { isBot: true },
    select: { id: true, totalPoints: true },
  });
  const botIds = allBots.map(b => b.id);
  console.log(`  Found ${botIds.length} bots`);

  // ── 2. Delete existing bot-created challenges ─────────────────────────────
  const deleted = await prisma.puzzleWarzChallenge.deleteMany({
    where: { challengerId: { in: botIds } },
  });
  console.log(`  Deleted ${deleted.count} existing bot warz challenges`);

  // ── 3. Fetch eligible puzzles ─────────────────────────────────────────────
  const eligiblePuzzles = await prisma.puzzle.findMany({
    where: { isActive: true, puzzleType: { in: ALLOWED_TYPES } },
    select: { id: true, puzzleType: true },
  });
  console.log(`  Found ${eligiblePuzzles.length} eligible puzzles across types:`);

  // Count by type
  const byType: Record<string, number> = {};
  for (const p of eligiblePuzzles) {
    byType[p.puzzleType] = (byType[p.puzzleType] ?? 0) + 1;
  }
  for (const [type, count] of Object.entries(byType)) {
    console.log(`    ${type.padEnd(18)} ${count} puzzles`);
  }

  if (eligiblePuzzles.length === 0) {
    console.error("\n❌ No eligible puzzles found — check puzzle types in DB.");
    return;
  }

  // ── 4. Pick bots with enough points ──────────────────────────────────────
  const warzBots = allBots.filter(b => b.totalPoints > 500);
  console.log(`\n  ${warzBots.length} bots eligible to issue challenges`);

  if (warzBots.length < 2) {
    console.error("❌ Not enough bots with points > 500.");
    return;
  }

  const warzRows: Parameters<typeof prisma.puzzleWarzChallenge.createMany>[0]["data"] = [];

  // ── 5. ~300 COMPLETED challenges (historical social proof) ────────────────
  const completedTarget = Math.min(300, warzBots.length - 1);
  for (let i = 0; i < completedTarget; i++) {
    const challenger = warzBots[i];
    const opponent   = warzBots[(i + randInt(1, 15)) % warzBots.length];
    if (challenger.id === opponent.id) continue;

    const puzzle = pickRand(eligiblePuzzles);
    const range  = WARZ_TYPES[puzzle.puzzleType] ?? { min: 60, max: 600 };

    // Smarter time: higher-point players tend to be faster
    const pointsFactor = Math.min(1, challenger.totalPoints / 100000);
    const speedBias    = Math.floor((range.max - range.min) * pointsFactor * 0.4); // up to 40% faster
    const challengerTime = randInt(range.min, range.max - speedBias);

    const opponentFactor = Math.min(1, opponent.totalPoints / 100000);
    const opponentBias   = Math.floor((range.max - range.min) * opponentFactor * 0.4);
    const opponentTime   = randInt(range.min, range.max - opponentBias);

    const winnerId    = challengerTime <= opponentTime ? challenger.id : opponent.id;
    const completedAt = new Date(Date.now() - randInt(1, 90) * 86400000); // up to 90 days ago

    warzRows.push({
      puzzleId:        puzzle.id,
      challengerId:    challenger.id,
      challengerTime,
      challengerWager: randInt(10, 300),
      opponentId:      opponent.id,
      opponentTime,
      status:          "COMPLETED",
      winnerId,
      potPaid:         true,
      expiresAt:       new Date(completedAt.getTime() + 86400000),
      createdAt:       new Date(completedAt.getTime() - randInt(1, 6) * 3600000),
      completedAt,
    });
  }

  // ── 6. ~60 OPEN challenges (live in lobby right now) ─────────────────────
  const openTarget = Math.min(60, warzBots.length - completedTarget);
  for (let i = 0; i < openTarget; i++) {
    const idx        = (i + completedTarget) % warzBots.length;
    const challenger = warzBots[idx];
    const puzzle     = pickRand(eligiblePuzzles);
    const range      = WARZ_TYPES[puzzle.puzzleType] ?? { min: 60, max: 600 };

    const pointsFactor   = Math.min(1, challenger.totalPoints / 100000);
    const speedBias      = Math.floor((range.max - range.min) * pointsFactor * 0.4);
    const challengerTime = randInt(range.min, range.max - speedBias);

    warzRows.push({
      puzzleId:        puzzle.id,
      challengerId:    challenger.id,
      challengerTime,
      challengerWager: randInt(10, 200),
      status:          "OPEN",
      potPaid:         false,
      expiresAt:       new Date(Date.now() + randInt(1, 23) * 3600000), // expires 1–23h from now
      createdAt:       new Date(Date.now() - randInt(1, 20) * 3600000),
    });
  }

  // ── 7. Insert in batches ──────────────────────────────────────────────────
  let inserted = 0;
  for (let i = 0; i < warzRows.length; i += 50) {
    await prisma.puzzleWarzChallenge.createMany({
      data: warzRows.slice(i, i + 50) as any,
      skipDuplicates: true,
    });
    inserted += Math.min(50, warzRows.length - i);
    process.stdout.write(`\r  Inserted ${inserted}/${warzRows.length}...`);
  }

  console.log(`\n\n✅ Done. Inserted ${warzRows.length} Warz challenge records.`);

  // ── 8. Summary ────────────────────────────────────────────────────────────
  const openCount      = warzRows.filter(r => r.status === "OPEN").length;
  const completedCount = warzRows.filter(r => r.status === "COMPLETED").length;
  console.log(`    OPEN:      ${openCount}`);
  console.log(`    COMPLETED: ${completedCount}`);
  console.log(`\n  Type breakdown:`);
  const typeCounts: Record<string, number> = {};
  for (const r of warzRows) {
    const puzzle = eligiblePuzzles.find(p => p.id === r.puzzleId);
    if (puzzle) typeCounts[puzzle.puzzleType] = (typeCounts[puzzle.puzzleType] ?? 0) + 1;
  }
  for (const [t, c] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t.padEnd(18)} ${c}`);
  }
}

main()
  .catch(e => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
