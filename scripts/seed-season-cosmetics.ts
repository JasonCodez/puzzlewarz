import { PrismaClient } from "@prisma/client";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

const seasonCosmetics = [
  // Frames
  {
    key: "frame_ignition_bronze",
    name: "Ignition Bronze Frame",
    description: "A warm bronze avatar frame — Season 1 Tier 5 exclusive.",
    category: "cosmetic",
    subcategory: "frame",
    price: 0,
    isConsumable: false,
    isExclusive: true,
    iconEmoji: "🥉",
    metadata: { value: "ignition_bronze", color: "#CD7F32" },
  },
  {
    key: "frame_ignition_silver",
    name: "Ignition Silver Frame",
    description: "A gleaming silver avatar frame — Season 1 Tier 10 exclusive.",
    category: "cosmetic",
    subcategory: "frame",
    price: 0,
    isConsumable: false,
    isExclusive: true,
    iconEmoji: "🥈",
    metadata: { value: "ignition_silver", color: "#C0C0C0" },
  },
  {
    key: "frame_ignition_gold",
    name: "Ignition Gold Frame",
    description: "A radiant gold avatar frame — Season 1 Tier 20 exclusive.",
    category: "cosmetic",
    subcategory: "frame",
    price: 0,
    isConsumable: false,
    isExclusive: true,
    iconEmoji: "🥇",
    metadata: { value: "ignition_gold", color: "#FFD700" },
  },
  {
    key: "frame_ignition_legendary",
    name: "Ignition Legendary Frame",
    description: "The ultimate inferno frame — Season 1 Tier 30 exclusive. Only the most dedicated earn this.",
    category: "cosmetic",
    subcategory: "frame",
    price: 0,
    isConsumable: false,
    isExclusive: true,
    iconEmoji: "🔥",
    metadata: { value: "ignition_legendary", color: "#FF3232" },
  },
  // Themes
  {
    key: "theme_ignition_ember",
    name: "Ignition Ember Theme",
    description: "A smoldering ember profile theme — Season 1 Tier 15 exclusive.",
    category: "cosmetic",
    subcategory: "theme",
    price: 0,
    isConsumable: false,
    isExclusive: true,
    iconEmoji: "🌋",
    metadata: { value: "ignition_ember", color: "#FB923C" },
  },
  {
    key: "theme_ignition_inferno",
    name: "Ignition Inferno Theme",
    description: "A blazing inferno profile theme — Season 1 Tier 25 exclusive. Pure fire.",
    category: "cosmetic",
    subcategory: "theme",
    price: 0,
    isConsumable: false,
    isExclusive: true,
    iconEmoji: "🔥",
    metadata: { value: "ignition_inferno", color: "#FF3232" },
  },
];

async function main() {
  for (const item of seasonCosmetics) {
    const existing = await prisma.storeItem.findUnique({ where: { key: item.key } });
    if (existing) {
      console.log(`  Already exists: ${item.key}`);
      continue;
    }
    await prisma.storeItem.create({ data: item });
    console.log(`  Created: ${item.key}`);
  }
  console.log("Done! Season 1 exclusive cosmetics are ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
