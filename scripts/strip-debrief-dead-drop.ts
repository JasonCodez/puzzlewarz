import { PrismaClient } from "@prisma/client";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function removeDeadDropFromDebrief(data: unknown): { changed: boolean; next: unknown } {
  if (!isRecord(data)) return { changed: false, next: data };

  const debrief = data["debrief"];
  if (!isRecord(debrief)) return { changed: false, next: data };
  if (!Object.prototype.hasOwnProperty.call(debrief, "deadDrop")) {
    return { changed: false, next: data };
  }

  const next = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  const nextDebrief = next["debrief"];

  if (isRecord(nextDebrief) && Object.prototype.hasOwnProperty.call(nextDebrief, "deadDrop")) {
    delete nextDebrief["deadDrop"];
    return { changed: true, next };
  }

  return { changed: false, next: data };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const debriefPuzzles = await prisma.puzzle.findMany({
    where: { puzzleType: "debrief" },
    select: { id: true, title: true, data: true },
  });

  let changedCount = 0;

  for (const puzzle of debriefPuzzles) {
    const { changed, next } = removeDeadDropFromDebrief(puzzle.data);
    if (!changed) continue;

    changedCount += 1;

    if (!dryRun) {
      await prisma.puzzle.update({
        where: { id: puzzle.id },
        data: { data: next as any },
      });
    }

    console.log(
      `[${dryRun ? "dry-run" : "updated"}] ${puzzle.id} ${puzzle.title ? `- ${puzzle.title}` : ""}`
    );
  }

  console.log(
    `${dryRun ? "Would update" : "Updated"} ${changedCount} debrief puzzle(s) out of ${debriefPuzzles.length} checked.`
  );
}

main()
  .catch((error) => {
    console.error("Failed to strip deadDrop from debrief puzzle data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
