import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

const achievements = [
  // === MILESTONE BADGES ===
  {
    name: "first_blood",
    title: "First Blood",
    description: "Solve your first puzzle",
    icon: "🩸",
    category: "milestone",
    rarity: "common",
    requirement: "Solve 1 puzzle",
    conditionType: "puzzles_solved",
    conditionValue: 1,
  },
  {
    name: "decade_club",
    title: "Decade Club",
    description: "Solve 10 puzzles",
    icon: "🔟",
    category: "milestone",
    rarity: "common",
    requirement: "Solve 10 puzzles",
    conditionType: "puzzles_solved",
    conditionValue: 10,
  },
  {
    name: "century_club",
    title: "Century Club",
    description: "Solve 100 puzzles",
    icon: "💯",
    category: "milestone",
    rarity: "rare",
    requirement: "Solve 100 puzzles",
    conditionType: "puzzles_solved",
    conditionValue: 100,
  },
  {
    name: "legend_status",
    title: "Legend Status",
    description: "Solve 500 puzzles",
    icon: "👑",
    category: "milestone",
    rarity: "epic",
    requirement: "Solve 500 puzzles",
    conditionType: "puzzles_solved",
    conditionValue: 500,
  },
  {
    name: "cryptic_god",
    title: "Cryptic God",
    description: "Solve 1000 puzzles",
    icon: "🌟",
    category: "milestone",
    rarity: "legendary",
    requirement: "Solve 1000 puzzles",
    conditionType: "puzzles_solved",
    conditionValue: 1000,
  },

  // === SPEED BADGES ===
  {
    name: "speed_runner",
    title: "Speed Runner",
    description: "Solve a puzzle in under 5 minutes",
    icon: "⚡",
    category: "speed",
    rarity: "uncommon",
    requirement: "Complete a puzzle very quickly",
    conditionType: "time_based",
    conditionValue: null,
  },
  {
    name: "lightning_fast",
    title: "Lightning Fast",
    description: "Solve a puzzle in under 1 minute",
    icon: "🔥",
    category: "speed",
    rarity: "rare",
    requirement: "Complete a puzzle extremely quickly",
    conditionType: "time_based",
    conditionValue: null,
  },
  {
    name: "instant_solver",
    title: "Instant Solver",
    description: "Solve 3 puzzles without errors on first try",
    icon: "⏱️",
    category: "speed",
    rarity: "rare",
    requirement: "Perfect accuracy on multiple puzzles",
    conditionType: "submission_accuracy",
    conditionValue: 3,
  },

  // === POINTS BADGES ===
  {
    name: "point_collector",
    title: "Point Collector",
    description: "Earn 1,000 points",
    icon: "💰",
    category: "mastery",
    rarity: "common",
    requirement: "Earn 1,000 points total",
    conditionType: "points_earned",
    conditionValue: 1000,
  },
  {
    name: "point_magnate",
    title: "Point Magnate",
    description: "Earn 10,000 points",
    icon: "💎",
    category: "mastery",
    rarity: "uncommon",
    requirement: "Earn 10,000 points total",
    conditionType: "points_earned",
    conditionValue: 10000,
  },
  {
    name: "millionaire_status",
    title: "Millionaire",
    description: "Earn 1,000,000 points",
    icon: "🤑",
    category: "mastery",
    rarity: "legendary",
    requirement: "Earn 1,000,000 points total",
    conditionType: "points_earned",
    conditionValue: 1000000,
  },

  // === CONSISTENCY BADGES ===
  {
    name: "streak_beginner",
    title: "On Fire",
    description: "Maintain a 7-day solving streak",
    icon: "🔥",
    category: "exploration",
    rarity: "uncommon",
    requirement: "Solve puzzles for 7 consecutive days",
    conditionType: "streak",
    conditionValue: 7,
  },
  {
    name: "streak_master",
    title: "Streak Master",
    description: "Maintain a 30-day solving streak",
    icon: "🏔️",
    category: "exploration",
    rarity: "epic",
    requirement: "Solve puzzles for 30 consecutive days",
    conditionType: "streak",
    conditionValue: 30,
  },
  {
    name: "unstoppable",
    title: "Unstoppable",
    description: "Maintain a 100-day solving streak",
    icon: "💪",
    category: "exploration",
    rarity: "legendary",
    requirement: "Solve puzzles for 100 consecutive days",
    conditionType: "streak",
    conditionValue: 100,
  },

  // === COLLABORATION BADGES ===
  {
    name: "team_player",
    title: "Team Player",
    description: "Join your first team",
    icon: "👥",
    category: "collaboration",
    rarity: "common",
    requirement: "Join a team",
    conditionType: "team_size",
    conditionValue: 1,
  },
  {
    name: "connector",
    title: "Connector",
    description: "Create a team with 5+ members",
    icon: "🌐",
    category: "collaboration",
    rarity: "rare",
    requirement: "Lead a team of 5 or more players",
    conditionType: "team_size",
    conditionValue: 5,
  },
  {
    name: "alliance_leader",
    title: "Alliance Leader",
    description: "Create a team with 10+ members",
    icon: "👑",
    category: "collaboration",
    rarity: "epic",
    requirement: "Lead a team of 10 or more players",
    conditionType: "team_size",
    conditionValue: 10,
  },
  {
    name: "mentor",
    title: "Mentor",
    description: "Help 3 different team members solve their first puzzle",
    icon: "📚",
    category: "collaboration",
    rarity: "uncommon",
    requirement: "Be part of team success",
    conditionType: "custom",
    conditionValue: 3,
  },

  // === CATEGORY MASTERY ===
  {
    name: "crypto_master",
    title: "Crypto Master",
    description: "Solve 50 cryptography puzzles",
    icon: "🔐",
    category: "mastery",
    rarity: "rare",
    requirement: "Solve 50 cryptography puzzles",
    conditionType: "puzzle_category",
    conditionValue: 50,
  },
  {
    name: "logic_guru",
    title: "Logic Guru",
    description: "Solve 50 logic puzzles",
    icon: "🧠",
    category: "mastery",
    rarity: "rare",
    requirement: "Solve 50 logic puzzles",
    conditionType: "puzzle_category",
    conditionValue: 50,
  },
  {
    name: "wordsmith",
    title: "Wordsmith",
    description: "Solve 50 word puzzles",
    icon: "📝",
    category: "mastery",
    rarity: "rare",
    requirement: "Solve 50 word puzzles",
    conditionType: "puzzle_category",
    conditionValue: 50,
  },

  // === EXPLORATION BADGES ===
  {
    name: "early_bird",
    title: "Early Bird",
    description: "Solve a puzzle before 6 AM",
    icon: "🌅",
    category: "exploration",
    rarity: "uncommon",
    requirement: "Solve a puzzle early in the morning",
    conditionType: "custom",
    conditionValue: null,
  },
  {
    name: "night_owl",
    title: "Night Owl",
    description: "Solve a puzzle after midnight",
    icon: "🌙",
    category: "exploration",
    rarity: "uncommon",
    requirement: "Solve a puzzle late at night",
    conditionType: "custom",
    conditionValue: null,
  },
  {
    name: "explorer",
    title: "Explorer",
    description: "Solve puzzles from 10 different categories",
    icon: "🧭",
    category: "exploration",
    rarity: "uncommon",
    requirement: "Solve puzzles across diverse categories",
    conditionType: "puzzle_category",
    conditionValue: 10,
  },

  // === ACCURACY & PRECISION ===
  {
    name: "perfect_shot",
    title: "Perfect Shot",
    description: "Solve a puzzle on first try",
    icon: "🎯",
    category: "speed",
    rarity: "uncommon",
    requirement: "Get a puzzle right on the first submission",
    conditionType: "submission_accuracy",
    conditionValue: 1,
  },
  {
    name: "bullseye",
    title: "Bullseye",
    description: "Solve 10 puzzles on first try",
    icon: "🏹",
    category: "speed",
    rarity: "rare",
    requirement: "Get 10 puzzles right on first submission",
    conditionType: "submission_accuracy",
    conditionValue: 10,
  },
  {
    name: "sharpshooter",
    title: "Sharpshooter",
    description: "Solve 50 puzzles on first try",
    icon: "🎪",
    category: "speed",
    rarity: "epic",
    requirement: "Get 50 puzzles right on first submission",
    conditionType: "submission_accuracy",
    conditionValue: 50,
  },

  // === SPECIAL & HIDDEN ===
  {
    name: "hint_minimalist",
    title: "Hint Minimalist",
    description: "Solve 20 puzzles without using hints",
    icon: "🚫💡",
    category: "special",
    rarity: "rare",
    requirement: "Solve puzzles without assistance",
    conditionType: "custom",
    conditionValue: 20,
  },
  {
    name: "hint_hoarder",
    title: "Hint Hoarder",
    description: "Collect all available hints for 10 puzzles",
    icon: "💡💡",
    category: "special",
    rarity: "uncommon",
    requirement: "Use all hints available on 10 puzzles",
    conditionType: "custom",
    conditionValue: 10,
  },
  {
    name: "comeback_king",
    title: "Comeback King",
    description: "Solve a puzzle after 50+ attempts",
    icon: "💪",
    category: "special",
    rarity: "epic",
    requirement: "Never give up on the hardest puzzles",
    conditionType: "custom",
    conditionValue: 50,
  },
  {
    name: "social_butterfly",
    title: "Social Butterfly",
    description: "Invite 5 friends to join Kryptyk Labs",
    icon: "🦋",
    category: "collaboration",
    rarity: "rare",
    requirement: "Grow the community with invites",
    conditionType: "custom",
    conditionValue: 5,
  },
];

async function seedAchievements() {
  console.log("🌱 Seeding achievements...");

  let seededCount = 0;
  for (const achievement of achievements) {
    console.log(`- Seeding achievement: ${achievement.name}`);
    try {
      await prisma.achievement.upsert({
        where: { name: achievement.name },
        update: {
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category,
          rarity: achievement.rarity,
          requirement: achievement.requirement,
          conditionType: achievement.conditionType,
          conditionValue: achievement.conditionValue === null ? undefined : achievement.conditionValue,
        },
        create: {
          name: achievement.name,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category,
          rarity: achievement.rarity,
          requirement: achievement.requirement,
          conditionType: achievement.conditionType,
          conditionValue: achievement.conditionValue === null ? undefined : achievement.conditionValue,
        },
      });
      seededCount += 1;
    } catch (e) {
      console.error(`❌ Error seeding achievement ${achievement.name}:`, e);
    }
  }

  console.log(`✅ Seeded ${seededCount}/${achievements.length} achievements!`);
}

const STORE_ITEMS = [
  // ── Streak / Puzzle tokens ─────────────────────────────────────────────
  { key: "streak_shield", name: "Streak Shield", description: "Protects your daily puzzle streak for one day if you miss. Consumed automatically when needed.", category: "streak", subcategory: "token", price: 100, isConsumable: true, iconEmoji: "🛡️", metadata: {} },
  { key: "skip_token", name: "Skip Token", description: "Skip a daily puzzle without breaking your streak. One-time use.", category: "streak", subcategory: "token", price: 75, isConsumable: true, iconEmoji: "⏭️", metadata: {} },
  { key: "hint_token", name: "Hint Token", description: "Unlock one hint on any puzzle that normally has no hints (daily, competitive). One-time use.", category: "puzzle", subcategory: "token", price: 50, isConsumable: true, iconEmoji: "💡", metadata: { count: 1 } },
  { key: "hint_pack_3", name: "Hint Pack ×3", description: "3 hint tokens in one purchase. Save 20% vs buying individually.", category: "puzzle", subcategory: "token", price: 120, isConsumable: true, iconEmoji: "💡", metadata: { count: 3 } },
  { key: "hint_pack_5", name: "Hint Pack ×5", description: "5 hint tokens in one purchase. Save 30% vs buying individually.", category: "puzzle", subcategory: "token", price: 175, isConsumable: true, iconEmoji: "💡", metadata: { count: 5 } },
  { key: "hint_pack_10", name: "Hint Pack ×10", description: "10 hint tokens in one purchase. Save 40% vs buying individually.", category: "puzzle", subcategory: "token", price: 300, isConsumable: true, iconEmoji: "💡", metadata: { count: 10 } },
  // ── Warz enhancements ──────────────────────────────────────────────────
  { key: "warz_slot", name: "Extra Warz Slot", description: "Permanently adds one more open Warz challenge slot (default: 3). Stack up to 10 total.", category: "warz", subcategory: "slot", price: 300, isConsumable: false, iconEmoji: "⚔️", metadata: { maxTotal: 10 } },
  { key: "warz_extend_expiry", name: "Challenge Extension", description: "Extend one open Warz challenge expiry from 24h to 72h. One-time use per challenge.", category: "warz", subcategory: "token", price: 150, isConsumable: true, iconEmoji: "⏳", metadata: { extraHours: 48 } },
  { key: "warz_spotlight", name: "Spotlight Boost", description: "Pin your open Warz challenge to the top of the lobby for 1 hour.", category: "warz", subcategory: "token", price: 200, isConsumable: true, iconEmoji: "🔦", metadata: { durationMinutes: 60 } },
  { key: "warz_rematch", name: "Rematch Token", description: "Challenge a specific opponent to a rematch on the same puzzle. They still have to accept.", category: "warz", subcategory: "token", price: 100, isConsumable: true, iconEmoji: "🔄", metadata: {} },
  // ── Profile cosmetics ──────────────────────────────────────────────────
  { key: "theme_gold", name: "Gold Theme", description: "A rich gold & black profile theme.", category: "cosmetic", subcategory: "theme", price: 500, isConsumable: false, iconEmoji: "🌟", metadata: { value: "gold", primaryColor: "#FDE74C", accentColor: "#FFB86B" } },
  { key: "theme_neon", name: "Neon Theme", description: "Electric cyan & purple neon profile theme.", category: "cosmetic", subcategory: "theme", price: 500, isConsumable: false, iconEmoji: "⚡", metadata: { value: "neon", primaryColor: "#00FFFF", accentColor: "#CC00FF" } },
  { key: "theme_crimson", name: "Crimson Theme", description: "Deep red & dark profile theme for the bold.", category: "cosmetic", subcategory: "theme", price: 500, isConsumable: false, iconEmoji: "🔥", metadata: { value: "crimson", primaryColor: "#DC2626", accentColor: "#F97316" } },
  // ── Avatar frames ──────────────────────────────────────────────────────
  { key: "frame_gold", name: "Gold Frame", description: "Animated golden border around your avatar.", category: "cosmetic", subcategory: "frame", price: 400, isConsumable: false, iconEmoji: "🏅", metadata: { value: "gold" } },
  { key: "frame_neon", name: "Neon Frame", description: "Pulsing neon glow frame around your avatar.", category: "cosmetic", subcategory: "frame", price: 400, isConsumable: false, iconEmoji: "💫", metadata: { value: "neon" } },
  { key: "frame_flame", name: "Flame Frame", description: "Animated fire border blazing around your avatar.", category: "cosmetic", subcategory: "frame", price: 600, isConsumable: false, iconEmoji: "🔥", metadata: { value: "flame" } },
  // ── Username flair ────────────────────────────────────────────────────
  { key: "flair_crown", name: "Crown Flair", description: "Display a 👑 crown next to your name on leaderboards and profiles.", category: "cosmetic", subcategory: "flair", price: 350, isConsumable: false, iconEmoji: "👑", metadata: { value: "crown", emoji: "👑" } },
  { key: "flair_fire", name: "Fire Flair", description: "Display a 🔥 next to your name.", category: "cosmetic", subcategory: "flair", price: 200, isConsumable: false, iconEmoji: "🔥", metadata: { value: "fire", emoji: "🔥" } },
  { key: "flair_lightning", name: "Lightning Flair", description: "Display a ⚡ next to your name — for the speedrunners.", category: "cosmetic", subcategory: "flair", price: 200, isConsumable: false, iconEmoji: "⚡", metadata: { value: "lightning", emoji: "⚡" } },
  { key: "flair_warz_legend", name: "Warz Legend Flair", description: "Display the ⚔️ Warz Legend badge next to your name.", category: "cosmetic", subcategory: "flair", price: 750, isConsumable: false, iconEmoji: "⚔️", metadata: { value: "warz_legend", emoji: "⚔️🏆" } },
  // ── Puzzle skins ──────────────────────────────────────────────────────
  { key: "skin_retro", name: "Retro Skin", description: "Classic 8-bit pixel art style for puzzle boards.", category: "cosmetic", subcategory: "skin", price: 450, isConsumable: false, iconEmoji: "🕹️", metadata: { value: "retro" } },
  { key: "skin_minimal", name: "Minimal Skin", description: "Clean white-on-dark minimal design for puzzle boards.", category: "cosmetic", subcategory: "skin", price: 350, isConsumable: false, iconEmoji: "⬜", metadata: { value: "minimal" } },
  { key: "skin_neon", name: "Neon Skin", description: "Glowing neon grid lines for puzzle boards.", category: "cosmetic", subcategory: "skin", price: 450, isConsumable: false, iconEmoji: "💜", metadata: { value: "neon" } },
  // ── Team banners ──────────────────────────────────────────────────────
  { key: "team_banner_gold", name: "Gold Team Banner", description: "Unlock a gold banner color for your team on the leaderboard.", category: "social", subcategory: "banner", price: 600, isConsumable: false, iconEmoji: "🏆", metadata: { value: "gold", color: "#FDE74C" } },
  { key: "team_banner_crimson", name: "Crimson Team Banner", description: "Unlock a deep crimson banner for your team.", category: "social", subcategory: "banner", price: 400, isConsumable: false, iconEmoji: "🚩", metadata: { value: "crimson", color: "#DC2626" } },
  { key: "team_banner_neon", name: "Neon Team Banner", description: "Unlock a glowing neon cyan banner for your team.", category: "social", subcategory: "banner", price: 400, isConsumable: false, iconEmoji: "💠", metadata: { value: "neon", color: "#00FFFF" } },
];

async function seedStoreItems() {
  console.log("🌱 Seeding store items...");
  let created = 0;
  let skipped = 0;
  for (const item of STORE_ITEMS) {
    const existing = await prisma.storeItem.findUnique({ where: { key: item.key } });
    if (existing) { skipped++; continue; }
    await prisma.storeItem.create({ data: item });
    created++;
    console.log(`  ✓ ${item.iconEmoji} ${item.name}`);
  }
  console.log(`✅ Store items: ${created} created, ${skipped} already existed.`);
}

// Run seeding in a single flow so we only disconnect once
async function main() {
  try {
    await seedAchievements();
    await seedStoreItems();
    await seedEscapeRoomExample();
    await seedDetectiveCaseNoirExample();
    console.log('🎉 All seeds completed successfully.');
  } catch (e) {
    console.error('❌ Seed run failed:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

// --- Escape room example seed ---
async function seedEscapeRoomExample() {
  console.log("🌱 Seeding escape room example...");

  // Ensure an author user exists
  const author = await prisma.user.upsert({
    where: { email: 'seed@author.local' },
    update: { name: 'Seed Author' },
    create: { email: 'seed@author.local', name: 'Seed Author', role: 'admin' },
  });

  // Ensure the production admin user exists
  const adminPassword = await bcrypt.hash('Arm4469nine2686tee!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@puzzlewarz.com' },
    update: { name: 'Admin', role: 'admin', password: adminPassword },
    create: {
      email: 'admin@puzzlewarz.com',
      name: 'Admin',
      role: 'admin',
      password: adminPassword,
    },
  });

  // Create or reuse a category for escape rooms
  const category = await prisma.puzzleCategory.upsert({
    where: { name: 'Escape' },
    update: {},
    create: { name: 'Escape', description: 'Escape room style puzzles', color: '#7C3AED' },
  });

  // Create a puzzle entry
  const puzzle = await prisma.puzzle.create({
    data: {
      title: 'Seed: The Detective Office',
      description: 'A short demo escape room: find the key and unlock the drawer.',
      content: '<p>Start in the Detective\'s Office.</p>',
      categoryId: category.id,
      difficulty: 'easy',
      isActive: true,
      isTeamPuzzle: false,
    },
  });

  // Create escape room metadata
  const escapeRoom = await prisma.escapeRoomPuzzle.create({
    data: {
      puzzleId: puzzle.id,
      roomTitle: "Detective's Office (Seed)",
      roomDescription: 'Find the hidden key and unlock the drawer to retrieve the clue.',
      timeLimitSeconds: 600,
    },
  });

  // Layout
  const layout = await prisma.roomLayout.create({
    data: {
      escapeRoomId: escapeRoom.id,
      title: 'Office Layout',
      backgroundUrl: '',
      width: 1200,
      height: 720,
    },
  });

  // Items
  const goldenKey = await prisma.itemDefinition.upsert({
    where: { key: 'golden_key' },
    update: {
      name: 'Golden Key',
      description: 'A small brass key with an ornate head.',
      imageUrl: '',
      consumable: true,
      escapeRoomId: escapeRoom.id,
    },
    create: {
      escapeRoomId: escapeRoom.id,
      key: 'golden_key',
      name: 'Golden Key',
      description: 'A small brass key with an ornate head.',
      imageUrl: '',
      consumable: true,
    },
  });

  // Hotspots: a pickup hotspot for the key
  await prisma.hotspot.create({
    data: {
      layoutId: layout.id,
      x: 320,
      y: 420,
      w: 48,
      h: 24,
      type: 'pickup',
      targetId: goldenKey.id,
      meta: JSON.stringify({ label: 'Golden Key on desk' }),
    },
  });

  // A locked drawer that requires the golden_key
  await prisma.escapeLock.create({
    data: {
      layoutId: layout.id,
      lockType: 'item',
      requirement: JSON.stringify({ type: 'item', key: 'golden_key' }),
      secret: null,
      isLocked: true,
      requiredItemKey: 'golden_key',
    },
  });

  // Portal hotspot for a drawer (display)
  await prisma.hotspot.create({
    data: {
      layoutId: layout.id,
      x: 520,
      y: 500,
      w: 180,
      h: 80,
      type: 'interactive',
      targetId: null,
      meta: JSON.stringify({ label: 'Locked Drawer', lockKey: 'golden_key' }),
    },
  });

  // Create a player state record for the author (so playtest can start with empty state)
  await prisma.playerRoomState.upsert({
    where: { userId_escapeRoomId: { userId: author.id, escapeRoomId: escapeRoom.id } },
    update: { state: '{}' },
    create: { userId: author.id, escapeRoomId: escapeRoom.id, state: '{}' },
  });

  console.log('✅ Seeded escape room example.');
}

// --- Detective case example seed ---
async function seedDetectiveCaseNoirExample() {
  console.log('🌱 Seeding detective case noir example...');

  const category = await prisma.puzzleCategory.upsert({
    where: { name: 'Mystery' },
    update: {},
    create: { name: 'Mystery', description: 'Detective and noir cases', color: '#3891A6' },
  });

  // Avoid duplicate seed inserts if you re-run seeds.
  const existing = await prisma.puzzle.findFirst({
    where: { title: 'Seed: The Blackout Ledger', puzzleType: 'detective_case' },
    select: { id: true },
  });

  if (existing) {
    console.log('↪ Detective case already seeded.');
    return;
  }

  await prisma.puzzle.create({
    data: {
      title: 'Seed: The Blackout Ledger',
      description: 'A noir, multi-stage case. One wrong answer locks it forever.',
      content:
        'The rain writes confessions on the window.\n\nA blackout hits the city for eleven minutes. When the lights come back, a ledger page is missing—and a man is dead.\n\nSolve the case, stage by stage. Choose wrong once and the file gets stamped CLOSED.',
      categoryId: category.id,
      difficulty: 'medium',
      isActive: true,
      isTeamPuzzle: false,
      puzzleType: 'detective_case',
      data: {
        detectiveCase: {
          noirTitle: 'The Blackout Ledger',
          intro: 'Keep your fedora dry. The city isn\'t.',
          lockMode: 'fail_once',
          stages: [
            {
              id: 'scene',
              title: 'The Scene',
              prompt:
                'The office smells like cheap cologne and old mistakes.\n\nA matchbook sits in the ashtray. One token is scratched into the cover.\n\nSubmit the token.',
              kind: 'text',
              expectedAnswer: 'EMBER-11',
              ignoreCase: true,
              ignoreWhitespace: true,
            },
            {
              id: 'eclipse',
              title: 'The Matchbook',
              prompt:
                'Inside the matchbook: “11:07 Special.”\n\nThat\'s not a drink. That\'s a meeting.\n\nSubmit the code phrase.',
              kind: 'text',
              expectedAnswer: 'ECLIPSE-3',
              ignoreCase: true,
              ignoreWhitespace: true,
            },
            {
              id: 'ledger',
              title: 'The Ledger',
              prompt:
                'A carbon copy bleeds through the page like a secret that can\'t keep quiet.\n\nA number keeps showing up in the margins.\n\nSubmit it.',
              kind: 'text',
              expectedAnswer: 'CARBON-9',
              ignoreCase: true,
              ignoreWhitespace: true,
            },
          ],
        },
      },
      solutions: {
        create: [
          {
            answer: '__DETECTIVE_CASE__',
            isCorrect: true,
            points: 250,
            ignoreCase: true,
            ignoreWhitespace: false,
          },
        ],
      },
    },
  });

  console.log('✅ Seeded detective case noir example.');
}

// Run the escape room seed after the achievements
// (seedEscapeRoomExample is invoked from `main`)
