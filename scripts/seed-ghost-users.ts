/**
 * seed-ghost-users.ts
 *
 * Creates ~20 realistic "ghost" bot accounts with solve history
 * to bootstrap cold-start social proof on leaderboards and activity feeds.
 *
 * Design principles:
 * - Marked isBot=true in DB — transparent, never impersonates real users
 * - Realistic usernames, XP, and solve timings (not suspiciously perfect)
 * - Solve history spread over the past 3 weeks with natural gaps
 * - Mix of ranks (mostly A/B, a few S, a few C/F) — human distribution
 * - Run once; idempotent (skips existing ghost accounts by email)
 *
 * Usage: npx ts-node --project tsconfig.json scripts/seed-ghost-users.ts
 */

import { PrismaClient } from "@prisma/client";
import path from "path";
import { config } from "dotenv";
import bcrypt from "bcryptjs";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

// ── Ghost user definitions ─────────────────────────────────────────────────

const GHOST_USERS = [
  { name: "CipherHound",   xp: 2400, level: 8,  streak: 14 },
  { name: "DispatchKilo",  xp: 1800, level: 6,  streak: 9  },
  { name: "NullTrace",     xp: 1600, level: 6,  streak: 7  },
  { name: "SignalBreaker", xp: 1400, level: 5,  streak: 6  },
  { name: "GridSeeker",   xp: 1200, level: 5,  streak: 4  },
  { name: "VexCrown",     xp: 1100, level: 4,  streak: 5  },
  { name: "BlinkSolve",   xp: 950,  level: 4,  streak: 3  },
  { name: "RogueCipher",  xp: 850,  level: 4,  streak: 2  },
  { name: "LockpickMx",   xp: 750,  level: 3,  streak: 3  },
  { name: "TetraSpy",     xp: 700,  level: 3,  streak: 1  },
  { name: "VaultKey99",   xp: 600,  level: 3,  streak: 4  },
  { name: "FreqShifter",  xp: 500,  level: 2,  streak: 2  },
  { name: "Deadfall",     xp: 420,  level: 2,  streak: 1  },
  { name: "PatternHex",   xp: 380,  level: 2,  streak: 2  },
  { name: "Axiom77",      xp: 310,  level: 2,  streak: 0  },
  { name: "GlitchPilot",  xp: 280,  level: 2,  streak: 1  },
  { name: "NineHertz",    xp: 240,  level: 2,  streak: 0  },
  { name: "OverrideQ",    xp: 200,  level: 1,  streak: 1  },
  { name: "PulseDecoder", xp: 160,  level: 1,  streak: 0  },
  { name: "CodeMoth",     xp: 100,  level: 1,  streak: 0  },
];

// Rank distribution weights (sums to 100) — reflects realistic human play
const RANK_WEIGHTS = [
  { rank: "S", weight: 10 },
  { rank: "A", weight: 40 },
  { rank: "B", weight: 30 },
  { rank: "C", weight: 14 },
  { rank: "F", weight: 6  },
];

function pickRank(): string {
  const roll = Math.random() * 100;
  let acc = 0;
  for (const { rank, weight } of RANK_WEIGHTS) {
    acc += weight;
    if (roll < acc) return rank;
  }
  return "A";
}

/** Random int between min and max inclusive */
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Realistic solve time for a given rank (in seconds) */
function solveTimeForRank(rank: string): number {
  switch (rank) {
    case "S": return randInt(30,  100);
    case "A": return randInt(80,  200);
    case "B": return randInt(160, 320);
    case "C": return randInt(280, 500);
    case "F": return randInt(450, 900);
    default:  return randInt(100, 300);
  }
}

/** Submission count (attempts) for a given rank */
function submissionCountForRank(rank: string): number {
  switch (rank) {
    case "S": return 1;
    case "A": return randInt(1, 2);
    case "B": return randInt(2, 3);
    case "C": return randInt(3, 5);
    case "F": return randInt(5, 8);
    default:  return 1;
  }
}

/** Random date within the past `days` days, at a realistic hour */
function randomPastDate(maxDaysAgo: number, minDaysAgo = 0): Date {
  const daysAgo = randInt(minDaysAgo, maxDaysAgo);
  const hoursOffset = randInt(7, 23); // people don't solve at 3am usually
  const minuteOffset = randInt(0, 59);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hoursOffset, minuteOffset, randInt(0, 59), 0);
  return d;
}

async function main() {
  console.log("🤖 Seeding ghost users...\n");

  // Fetch available gridlock puzzles
  const puzzles = await prisma.puzzle.findMany({
    where: { puzzleType: "gridlock_file", isActive: true },
    select: { id: true },
  });

  if (puzzles.length === 0) {
    console.warn("⚠️  No active gridlock_file puzzles found. Solve records won't be created.");
  }

  const hashedPassword = await bcrypt.hash("ghostaccount_unloggable_" + Date.now(), 10);

  let created = 0;
  let skipped = 0;

  for (const ghost of GHOST_USERS) {
    const email = `ghost.${ghost.name.toLowerCase()}@internal.puzzlewarz.com`;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { skipped++; continue; }

    // Pick a random account creation date (1–21 days ago)
    const joinedAt = randomPastDate(21, 1);

    const user = await prisma.user.create({
      data: {
        email,
        name:         ghost.name,
        password:     hashedPassword,
        isBot:        true,
        xp:           ghost.xp,
        level:        ghost.level,
        xpTitle:      "Veteran",
        totalPoints:  ghost.xp,
        emailVerified: joinedAt,
        createdAt:    joinedAt,
      },
    });

    // Create streak record
    if (ghost.streak > 0) {
      await prisma.userStreak.create({
        data: {
          userId:        user.id,
          currentStreak: ghost.streak,
          longestStreak: ghost.streak + randInt(0, 3),
          lastSolveDate: new Date(),
        },
      });
    }

    // Create solve records
    if (puzzles.length > 0) {
      // Number of solves is proportional to XP / 100, capped at puzzle count
      const targetSolves = Math.min(
        Math.floor(ghost.xp / 100),
        puzzles.length,
      );

      // Shuffle puzzles so each ghost solves a different mix
      const shuffled = [...puzzles].sort(() => Math.random() - 0.5);
      const toSolve = shuffled.slice(0, targetSolves);

      for (let i = 0; i < toSolve.length; i++) {
        const rank = pickRank();
        // Older users solved earlier; recent solves clustered in last ~7 days
        const daysAgo = i < 3 ? randInt(1, 7) : randInt(7, 21);
        await prisma.gridlockSolve.create({
          data: {
            puzzleId:        toSolve[i].id,
            userId:          user.id,
            rank,
            elapsedSeconds:  solveTimeForRank(rank),
            submissionCount: submissionCountForRank(rank),
            solvedAt:        randomPastDate(daysAgo, 0),
          },
        });
      }

      console.log(`  ✅ ${ghost.name.padEnd(16)} — ${targetSolves} solves, streak ${ghost.streak}, XP ${ghost.xp}`);
    } else {
      console.log(`  ✅ ${ghost.name.padEnd(16)} — no puzzles to attach solves to`);
    }

    created++;
  }

  console.log(`\n🎉 Done! Created: ${created}, Skipped (already exists): ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
