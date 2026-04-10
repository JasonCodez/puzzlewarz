/**
 * Seeds a realistic solve distribution for a gridlock puzzle.
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-gridlock-distribution.ts
 * Or: npx tsx scripts/seed-gridlock-distribution.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Distribution: S=15%, A=25%, B=30%, C=20%, F=10%
// Time ranges (seconds): realistic spread per tier
const DISTRIBUTION: {
  rank: string;
  count: number;
  minSeconds: number;
  maxSeconds: number;
}[] = [
  { rank: "S", count: 75,  minSeconds: 28,  maxSeconds: 95  },
  { rank: "A", count: 125, minSeconds: 60,  maxSeconds: 210 },
  { rank: "B", count: 150, minSeconds: 90,  maxSeconds: 420 },
  { rank: "C", count: 100, minSeconds: 150, maxSeconds: 720 },
  { rank: "F", count: 50,  minSeconds: 200, maxSeconds: 1200 },
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Spread across the last 24 hours so solvedAt looks organic
function randSolvedAt(): Date {
  const now = Date.now();
  const msAgo = Math.floor(Math.random() * 24 * 60 * 60 * 1000);
  return new Date(now - msAgo);
}

async function main() {
  // Find the puzzle to seed — uses the most recent gridlock_file puzzle
  const puzzle = await prisma.puzzle.findFirst({
    where: { puzzleType: "gridlock_file" },
    orderBy: { createdAt: "desc" },
  });

  if (!puzzle) {
    console.error("No gridlock_file puzzle found. Run the main seed first.");
    process.exit(1);
  }

  // Check if already seeded
  const existing = await prisma.gridlockSolve.count({
    where: { puzzleId: puzzle.id },
  });
  if (existing > 0) {
    console.log(
      `Puzzle "${puzzle.title}" already has ${existing} solves. Skipping (delete them first to re-seed).`
    );
    process.exit(0);
  }

  console.log(`Seeding distribution for puzzle: ${puzzle.title} (${puzzle.id})`);

  const rows = DISTRIBUTION.flatMap(({ rank, count, minSeconds, maxSeconds }) =>
    Array.from({ length: count }, () => ({
      puzzleId: puzzle.id,
      userId: null,
      rank,
      elapsedSeconds: randInt(minSeconds, maxSeconds),
      submissionCount: rank === "S" ? 1
        : rank === "A" ? randInt(1, 2)
        : rank === "B" ? randInt(2, 3)
        : rank === "C" ? randInt(3, 5)
        : randInt(4, 8),
      solvedAt: randSolvedAt(),
    }))
  );

  // Batch insert
  await prisma.gridlockSolve.createMany({ data: rows });

  const total = rows.length;
  console.log(`Seeded ${total} solves:`);
  for (const { rank, count } of DISTRIBUTION) {
    const pct = Math.round((count / total) * 100);
    console.log(`  ${rank}: ${count} (${pct}%)`);
  }
  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
