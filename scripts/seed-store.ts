import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STORE_ITEMS = [
  // ── Streak / Puzzle tokens ─────────────────────────────────────────────
  {
    key: "streak_shield",
    name: "Streak Shield",
    description: "Protects your daily puzzle streak for one day if you miss. Consumed automatically when needed.",
    category: "streak",
    subcategory: "token",
    price: 100,
    isConsumable: true,
    iconEmoji: "🛡️",
    metadata: {},
  },
  {
    key: "skip_token",
    name: "Skip Token",
    description: "Skip a daily puzzle without breaking your streak. One-time use.",
    category: "streak",
    subcategory: "token",
    price: 75,
    isConsumable: true,
    iconEmoji: "⏭️",
    metadata: {},
  },
  {
    key: "hint_token",
    name: "Hint Token",
    description: "Unlock one hint on any puzzle that normally has no hints (daily, competitive). One-time use.",
    category: "puzzle",
    subcategory: "token",
    price: 50,
    isConsumable: true,
    iconEmoji: "💡",
    metadata: { count: 1 },
  },
  {
    key: "hint_pack_3",
    name: "Hint Pack ×3",
    description: "3 hint tokens in one purchase. Save 20% vs buying individually.",
    category: "puzzle",
    subcategory: "token",
    price: 120,
    isConsumable: true,
    iconEmoji: "💡",
    metadata: { count: 3 },
  },
  {
    key: "hint_pack_5",
    name: "Hint Pack ×5",
    description: "5 hint tokens in one purchase. Save 30% vs buying individually.",
    category: "puzzle",
    subcategory: "token",
    price: 175,
    isConsumable: true,
    iconEmoji: "💡",
    metadata: { count: 5 },
  },
  {
    key: "hint_pack_10",
    name: "Hint Pack ×10",
    description: "10 hint tokens in one purchase. Save 40% vs buying individually.",
    category: "puzzle",
    subcategory: "token",
    price: 300,
    isConsumable: true,
    iconEmoji: "💡",
    metadata: { count: 10 },
  },

  // ── Warz enhancements ──────────────────────────────────────────────────
  {
    key: "warz_slot",
    name: "Extra Warz Slot",
    description: "Permanently adds one more open Warz challenge slot (default: 3). Stack up to 10 total.",
    category: "warz",
    subcategory: "slot",
    price: 300,
    isConsumable: false,
    iconEmoji: "⚔️",
    metadata: { maxTotal: 10 },
  },
  {
    key: "warz_extend_expiry",
    name: "Challenge Extension",
    description: "Extend one open Warz challenge expiry from 24h to 72h. One-time use per challenge.",
    category: "warz",
    subcategory: "token",
    price: 150,
    isConsumable: true,
    iconEmoji: "⏳",
    metadata: { extraHours: 48 },
  },
  {
    key: "warz_spotlight",
    name: "Spotlight Boost",
    description: "Pin your open Warz challenge to the top of the lobby for 1 hour.",
    category: "warz",
    subcategory: "token",
    price: 200,
    isConsumable: true,
    iconEmoji: "🔦",
    metadata: { durationMinutes: 60 },
  },
  {
    key: "warz_rematch",
    name: "Rematch Token",
    description: "Challenge a specific opponent to a rematch on the same puzzle. They still have to accept.",
    category: "warz",
    subcategory: "token",
    price: 100,
    isConsumable: true,
    iconEmoji: "🔄",
    metadata: {},
  },

  // ── Profile cosmetics ──────────────────────────────────────────────────
  {
    key: "theme_gold",
    name: "Gold Theme",
    description: "A rich gold & black profile theme. Unlocks gold color scheme across your profile.",
    category: "cosmetic",
    subcategory: "theme",
    price: 500,
    isConsumable: false,
    iconEmoji: "🌟",
    metadata: { value: "gold", primaryColor: "#FDE74C", accentColor: "#FFB86B" },
  },
  {
    key: "theme_neon",
    name: "Neon Theme",
    description: "Electric cyan & purple neon profile theme.",
    category: "cosmetic",
    subcategory: "theme",
    price: 500,
    isConsumable: false,
    iconEmoji: "⚡",
    metadata: { value: "neon", primaryColor: "#00FFFF", accentColor: "#CC00FF" },
  },
  {
    key: "theme_crimson",
    name: "Crimson Theme",
    description: "Deep red & dark profile theme for the bold.",
    category: "cosmetic",
    subcategory: "theme",
    price: 500,
    isConsumable: false,
    iconEmoji: "🔥",
    metadata: { value: "crimson", primaryColor: "#DC2626", accentColor: "#F97316" },
  },

  // ── Avatar frames ──────────────────────────────────────────────────────
  {
    key: "frame_gold",
    name: "Gold Frame",
    description: "Animated golden border around your avatar.",
    category: "cosmetic",
    subcategory: "frame",
    price: 400,
    isConsumable: false,
    iconEmoji: "🏅",
    metadata: { value: "gold" },
  },
  {
    key: "frame_neon",
    name: "Neon Frame",
    description: "Pulsing neon glow frame around your avatar.",
    category: "cosmetic",
    subcategory: "frame",
    price: 400,
    isConsumable: false,
    iconEmoji: "💫",
    metadata: { value: "neon" },
  },
  {
    key: "frame_flame",
    name: "Flame Frame",
    description: "Animated fire border blazing around your avatar.",
    category: "cosmetic",
    subcategory: "frame",
    price: 600,
    isConsumable: false,
    iconEmoji: "🔥",
    metadata: { value: "flame" },
  },

  // ── Username flair ────────────────────────────────────────────────────
  {
    key: "flair_crown",
    name: "Crown Flair",
    description: "Display a 👑 crown next to your name on leaderboards and profiles.",
    category: "cosmetic",
    subcategory: "flair",
    price: 350,
    isConsumable: false,
    iconEmoji: "👑",
    metadata: { value: "crown", emoji: "👑" },
  },
  {
    key: "flair_fire",
    name: "Fire Flair",
    description: "Display a 🔥 next to your name.",
    category: "cosmetic",
    subcategory: "flair",
    price: 200,
    isConsumable: false,
    iconEmoji: "🔥",
    metadata: { value: "fire", emoji: "🔥" },
  },
  {
    key: "flair_lightning",
    name: "Lightning Flair",
    description: "Display a ⚡ next to your name — for the speedrunners.",
    category: "cosmetic",
    subcategory: "flair",
    price: 200,
    isConsumable: false,
    iconEmoji: "⚡",
    metadata: { value: "lightning", emoji: "⚡" },
  },
  {
    key: "flair_warz_legend",
    name: "Warz Legend Flair",
    description: "Display the ⚔️ Warz Legend badge next to your name.",
    category: "cosmetic",
    subcategory: "flair",
    price: 750,
    isConsumable: false,
    iconEmoji: "⚔️",
    metadata: { value: "warz_legend", emoji: "⚔️🏆" },
  },

  // ── Puzzle skins ──────────────────────────────────────────────────────
  {
    key: "skin_retro",
    name: "Retro Skin",
    description: "Classic 8-bit pixel art style for puzzle boards.",
    category: "cosmetic",
    subcategory: "skin",
    price: 450,
    isConsumable: false,
    iconEmoji: "🕹️",
    metadata: { value: "retro" },
  },
  {
    key: "skin_minimal",
    name: "Minimal Skin",
    description: "Clean white-on-dark minimal design for puzzle boards.",
    category: "cosmetic",
    subcategory: "skin",
    price: 350,
    isConsumable: false,
    iconEmoji: "⬜",
    metadata: { value: "minimal" },
  },
  {
    key: "skin_neon",
    name: "Neon Skin",
    description: "Glowing neon grid lines for puzzle boards.",
    category: "cosmetic",
    subcategory: "skin",
    price: 450,
    isConsumable: false,
    iconEmoji: "💜",
    metadata: { value: "neon" },
  },

  // ── Team banner ───────────────────────────────────────────────────────
  {
    key: "team_banner_gold",
    name: "Gold Team Banner",
    description: "Unlock a gold banner color for your team on the leaderboard.",
    category: "social",
    subcategory: "banner",
    price: 600,
    isConsumable: false,
    iconEmoji: "🏆",
    metadata: { value: "gold", color: "#FDE74C" },
  },
  {
    key: "team_banner_crimson",
    name: "Crimson Team Banner",
    description: "Unlock a deep crimson banner for your team.",
    category: "social",
    subcategory: "banner",
    price: 400,
    isConsumable: false,
    iconEmoji: "🚩",
    metadata: { value: "crimson", color: "#DC2626" },
  },
  {
    key: "team_banner_neon",
    name: "Neon Team Banner",
    description: "Unlock a glowing neon cyan banner for your team.",
    category: "social",
    subcategory: "banner",
    price: 400,
    isConsumable: false,
    iconEmoji: "💠",
    metadata: { value: "neon", color: "#00FFFF" },
  },
];

async function main() {
  console.log("Seeding store items...");
  let created = 0;
  let skipped = 0;

  for (const item of STORE_ITEMS) {
    const existing = await prisma.storeItem.findUnique({ where: { key: item.key } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.storeItem.create({ data: item });
    created++;
    console.log(`  ✓ ${item.iconEmoji} ${item.name}`);
  }

  console.log(`\nDone. Created ${created} items, skipped ${skipped} existing.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
