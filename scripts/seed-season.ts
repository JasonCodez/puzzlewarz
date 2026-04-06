import { PrismaClient } from "@prisma/client";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  // Season 1: runs 3 months from today
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 3);

  const existing = await prisma.season.findFirst({ where: { name: "Season 1 — Ignition" } });
  if (existing) {
    console.log("Season 1 already exists, skipping.");
    return;
  }

  const season = await prisma.season.create({
    data: {
      name: "Season 1 — Ignition",
      description: "The first season of Puzzle Warz! Solve puzzles, earn XP, climb the tiers.",
      startDate: start,
      endDate: end,
      isActive: true,
      premiumPrice: 500,
    },
  });

  console.log(`Created season: ${season.name} (${season.id})`);

  // 30 tiers with escalating XP requirements and alternating reward types
  const tiers: {
    tierNumber: number;
    xpRequired: number;
    freeRewardType: string | null;
    freeRewardKey: string | null;
    freeRewardQty: number;
    premRewardType: string | null;
    premRewardKey: string | null;
    premRewardQty: number;
  }[] = [
    // Tier 1-5: Early rewards, low XP
    { tierNumber: 1,  xpRequired: 50,    freeRewardType: "hint_tokens",    freeRewardKey: null, freeRewardQty: 1, premRewardType: "hint_tokens",    premRewardKey: null, premRewardQty: 2 },
    { tierNumber: 2,  xpRequired: 120,   freeRewardType: "points",         freeRewardKey: null, freeRewardQty: 25, premRewardType: "points",        premRewardKey: null, premRewardQty: 50 },
    { tierNumber: 3,  xpRequired: 200,   freeRewardType: "hint_tokens",    freeRewardKey: null, freeRewardQty: 1, premRewardType: "skip_tokens",    premRewardKey: null, premRewardQty: 1 },
    { tierNumber: 4,  xpRequired: 300,   freeRewardType: "points",         freeRewardKey: null, freeRewardQty: 30, premRewardType: "hint_tokens",   premRewardKey: null, premRewardQty: 3 },
    { tierNumber: 5,  xpRequired: 420,   freeRewardType: "streak_shields", freeRewardKey: null, freeRewardQty: 1, premRewardType: "cosmetic",       premRewardKey: "frame_ignition_bronze", premRewardQty: 1 },

    // Tier 6-10
    { tierNumber: 6,  xpRequired: 560,   freeRewardType: "hint_tokens",    freeRewardKey: null, freeRewardQty: 2, premRewardType: "points",         premRewardKey: null, premRewardQty: 75 },
    { tierNumber: 7,  xpRequired: 720,   freeRewardType: "points",         freeRewardKey: null, freeRewardQty: 40, premRewardType: "hint_tokens",   premRewardKey: null, premRewardQty: 3 },
    { tierNumber: 8,  xpRequired: 900,   freeRewardType: "skip_tokens",    freeRewardKey: null, freeRewardQty: 1, premRewardType: "streak_shields", premRewardKey: null, premRewardQty: 2 },
    { tierNumber: 9,  xpRequired: 1100,  freeRewardType: "hint_tokens",    freeRewardKey: null, freeRewardQty: 2, premRewardType: "skip_tokens",    premRewardKey: null, premRewardQty: 2 },
    { tierNumber: 10, xpRequired: 1350,  freeRewardType: "points",         freeRewardKey: null, freeRewardQty: 50, premRewardType: "cosmetic",      premRewardKey: "frame_ignition_silver", premRewardQty: 1 },

    // Tier 11-15
    { tierNumber: 11, xpRequired: 1600,  freeRewardType: "hint_tokens",    freeRewardKey: null, freeRewardQty: 2, premRewardType: "points",         premRewardKey: null, premRewardQty: 100 },
    { tierNumber: 12, xpRequired: 1900,  freeRewardType: "points",         freeRewardKey: null, freeRewardQty: 60, premRewardType: "hint_tokens",   premRewardKey: null, premRewardQty: 4 },
    { tierNumber: 13, xpRequired: 2250,  freeRewardType: "streak_shields", freeRewardKey: null, freeRewardQty: 1, premRewardType: "skip_tokens",    premRewardKey: null, premRewardQty: 2 },
    { tierNumber: 14, xpRequired: 2600,  freeRewardType: "hint_tokens",    freeRewardKey: null, freeRewardQty: 3, premRewardType: "streak_shields", premRewardKey: null, premRewardQty: 3 },
    { tierNumber: 15, xpRequired: 3000,  freeRewardType: "points",         freeRewardKey: null, freeRewardQty: 75, premRewardType: "cosmetic",      premRewardKey: "theme_ignition_ember", premRewardQty: 1 },

    // Tier 16-20
    { tierNumber: 16, xpRequired: 3500,  freeRewardType: "hint_tokens",    freeRewardKey: null, freeRewardQty: 3, premRewardType: "points",         premRewardKey: null, premRewardQty: 150 },
    { tierNumber: 17, xpRequired: 4000,  freeRewardType: "points",         freeRewardKey: null, freeRewardQty: 80, premRewardType: "hint_tokens",   premRewardKey: null, premRewardQty: 5 },
    { tierNumber: 18, xpRequired: 4600,  freeRewardType: "skip_tokens",    freeRewardKey: null, freeRewardQty: 2, premRewardType: "skip_tokens",    premRewardKey: null, premRewardQty: 3 },
    { tierNumber: 19, xpRequired: 5300,  freeRewardType: "hint_tokens",    freeRewardKey: null, freeRewardQty: 3, premRewardType: "streak_shields", premRewardKey: null, premRewardQty: 3 },
    { tierNumber: 20, xpRequired: 6000,  freeRewardType: "points",         freeRewardKey: null, freeRewardQty: 100, premRewardType: "cosmetic",     premRewardKey: "frame_ignition_gold", premRewardQty: 1 },

    // Tier 21-25
    { tierNumber: 21, xpRequired: 6800,  freeRewardType: "hint_tokens",    freeRewardKey: null, freeRewardQty: 4, premRewardType: "points",         premRewardKey: null, premRewardQty: 200 },
    { tierNumber: 22, xpRequired: 7700,  freeRewardType: "points",         freeRewardKey: null, freeRewardQty: 100, premRewardType: "hint_tokens",  premRewardKey: null, premRewardQty: 6 },
    { tierNumber: 23, xpRequired: 8700,  freeRewardType: "streak_shields", freeRewardKey: null, freeRewardQty: 2, premRewardType: "skip_tokens",    premRewardKey: null, premRewardQty: 4 },
    { tierNumber: 24, xpRequired: 9800,  freeRewardType: "hint_tokens",    freeRewardKey: null, freeRewardQty: 4, premRewardType: "streak_shields", premRewardKey: null, premRewardQty: 4 },
    { tierNumber: 25, xpRequired: 11000, freeRewardType: "points",         freeRewardKey: null, freeRewardQty: 150, premRewardType: "cosmetic",     premRewardKey: "theme_ignition_inferno", premRewardQty: 1 },

    // Tier 26-30: End-game rewards
    { tierNumber: 26, xpRequired: 12500, freeRewardType: "hint_tokens",    freeRewardKey: null, freeRewardQty: 5, premRewardType: "points",         premRewardKey: null, premRewardQty: 300 },
    { tierNumber: 27, xpRequired: 14000, freeRewardType: "points",         freeRewardKey: null, freeRewardQty: 150, premRewardType: "hint_tokens",  premRewardKey: null, premRewardQty: 8 },
    { tierNumber: 28, xpRequired: 16000, freeRewardType: "skip_tokens",    freeRewardKey: null, freeRewardQty: 3, premRewardType: "streak_shields", premRewardKey: null, premRewardQty: 5 },
    { tierNumber: 29, xpRequired: 18500, freeRewardType: "hint_tokens",    freeRewardKey: null, freeRewardQty: 5, premRewardType: "skip_tokens",    premRewardKey: null, premRewardQty: 5 },
    { tierNumber: 30, xpRequired: 21000, freeRewardType: "points",         freeRewardKey: null, freeRewardQty: 250, premRewardType: "cosmetic",     premRewardKey: "frame_ignition_legendary", premRewardQty: 1 },
  ];

  await prisma.seasonTier.createMany({
    data: tiers.map((t) => ({ seasonId: season.id, ...t })),
  });

  console.log(`Created ${tiers.length} tiers for ${season.name}`);
  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
