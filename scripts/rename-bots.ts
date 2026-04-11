/**
 * rename-bots.ts
 * Replaces all bot display names with realistic gaming usernames.
 *
 * Run:  npx tsx scripts/rename-bots.ts
 */

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

// ─── Name pools ───────────────────────────────────────────────────────────────

const WORDS_A = [
  "Shadow","Cipher","Pixel","Neon","Glitch","Rogue","Frost","Void","Byte","Vex",
  "Hex","Echo","Blaze","Phantom","Storm","Crypt","Sage","Myth","Iron","Ghost",
  "Nova","Drax","Krypt","Syn","Arc","Nexus","Dark","Swift","Ash","Grim",
  "Cobalt","Neural","Static","Vector","Toxic","Binary","Cinder","Spark","Dusk",
  "Reaper","Wrath","Sable","Raven","Steel","Titan","Ember","Lux","Omen","Slate",
  "Zenith","Apex","Onyx","Shard","Flare","Prism","Quantum","Azure","Crimson",
  "Lunar","Solar","Astral","Omega","Delta","Alpha","Sigma","Zephyr","Thorn",
  "Blade","Viper","Cobra","Talon","Rift","Haze","Pulse","Flux","Drift","Phase",
  "Surge","Shift","Trace","Flash","Burn","Cryo","Shock","Blitz","Hyper","Ultra",
];

const WORDS_B = [
  "Mind","Wolf","Fox","Hawk","Blade","Claw","Fang","Code","Vault","Lock",
  "Key","Node","Grid","Lane","Wire","Rune","Warden","Breaker","Hunter","Seeker",
  "Solver","Cracker","King","Lord","Prowler","Shifter","Runner","Striker","Weaver",
  "Forger","Caster","Bender","Walker","Specter","Wraith","Shade","Knight","Mage",
  "Storm","Spike","Ridge","Forge","Forge","Crypt","Maze","Drift","Peak","Surge",
  "Core","Byte","Monk","Sage","Ninja","Rogue","Pilot","Sniper","Scout","Guard",
  "Spawn","Drone","Clone","Agent","Ghost","Cipher","Titan","Beast","Force","Edge",
];

const SHORT_NUMBERS = [
  "","","","","","","","","","", // 10 empty = ~40% get no number
  "2","3","7","9","11","13","21","23","27","33",
  "42","47","64","69","77","88","99","100","101",
  "123","404","420","666","777","999","007","1337",
];

const SPECIAL_PREFIXES = [
  "x","X","i","o","v","j","z",
  "The","Itz","Its","Real","Pro","OG","xX","Xx",
  "Not","Just","Only","Dark","Ultra","Hyper","Super","Mega",
];

const SUFFIX_WORDS = [
  "Pro","GG","WZ","PW","Ace","Rex","Max","OP","XL","OG",
  "Jr","Sr","II","III","IV","V","HD","XD","FPS","RPG",
];

// ─── Deterministic pick ────────────────────────────────────────────────────────
function pick<T>(arr: T[], seed: number): T {
  return arr[((seed % arr.length) + arr.length) % arr.length];
}

function mixedCase(s: string, seed: number): string {
  // 15% chance to go fully lowercase
  return seed % 7 === 0 ? s.toLowerCase() : s;
}

// ─── Generate a pool of unique names ──────────────────────────────────────────
function buildNamePool(count: number): string[] {
  const used = new Set<string>();
  const names: string[] = [];

  // Pattern functions — each indexed so we cycle through all of them
  const patterns: ((i: number) => string)[] = [
    // 0: Simple compound — "ShadowWolf"
    (i) => mixedCase(pick(WORDS_A, i * 7) + pick(WORDS_B, i * 13), i),

    // 1: Compound + number — "CipherFox99"
    (i) => mixedCase(pick(WORDS_A, i * 11) + pick(WORDS_B, i * 17), i) + pick(SHORT_NUMBERS.filter(n => n !== ""), i * 3),

    // 2: Single word + number — "Phantom42"
    (i) => pick([...WORDS_A, ...WORDS_B], i * 19) + pick(["2","3","7","9","11","21","42","69","77","88","99","100","404","777"], i * 5),

    // 3: Special prefix — "xVoidHunter" / "TheRealCipher"
    (i) => {
      const pre = pick(SPECIAL_PREFIXES, i * 23);
      const word = pick(WORDS_A, i * 29);
      const noun = pick(WORDS_B, i * 31);
      // Shorter prefixes (single letters) → don't cap the next word
      return pre.length === 1
        ? pre + word + noun
        : pre + word + noun;
    },

    // 4: Compound + suffix word — "VaultPro" / "CipherGG"
    (i) => pick(WORDS_A, i * 37) + pick(WORDS_B, i * 41) + pick(SUFFIX_WORDS, i * 43),

    // 5: Two A words combined — "ShadowVoid"
    (i) => mixedCase(pick(WORDS_A, i * 47) + pick(WORDS_A, i * 53), i),

    // 6: Lowercase with number — "vaultbreaker99"
    (i) => (pick(WORDS_A, i * 59) + pick(WORDS_B, i * 61)).toLowerCase() + pick(["","","","7","9","77","99","42","100","404"], i * 67),

    // 7: Word + suffix word — "PhantomPro" / "VoidAce"
    (i) => pick([...WORDS_A, ...WORDS_B], i * 71) + pick(SUFFIX_WORDS, i * 73),
  ];

  let i = 0;
  let attempts = 0;

  while (names.length < count && attempts < count * 20) {
    const patternIdx = i % patterns.length;
    let name = patterns[patternIdx](i);

    // Trim stray underscores (belt + suspenders)
    name = name.replace(/_/g, "");

    // If still colliding, append a short disambiguator number
    if (used.has(name.toLowerCase())) {
      const disambig = (names.length % 89) + 2; // 2-90
      name = name + disambig;
    }

    if (!used.has(name.toLowerCase()) && name.length >= 4 && name.length <= 24) {
      used.add(name.toLowerCase());
      names.push(name);
    }

    i++;
    attempts++;
  }

  return names;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔄 Fetching all bot users...");

  const bots = await prisma.user.findMany({
    where: { isBot: true },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`  Found ${bots.length} bots`);

  // Also collect real (non-bot) usernames so we don't collide
  const realNames = await prisma.user.findMany({
    where: { isBot: false },
    select: { name: true },
  });
  const takenLower = new Set(
    realNames.map(u => (u.name ?? "").toLowerCase()).filter(Boolean)
  );

  console.log(`  Avoiding ${takenLower.size} existing real player names`);

  // Build a pool larger than we need, then filter any that clash with real names
  console.log(`  Generating name pool...`);
  let pool = buildNamePool(bots.length * 3);
  pool = pool.filter(n => !takenLower.has(n.toLowerCase()));
  pool = pool.slice(0, bots.length);

  if (pool.length < bots.length) {
    console.error(`❌ Could only generate ${pool.length} unique names for ${bots.length} bots`);
    return;
  }

  console.log(`  Generated ${pool.length} unique names. Updating...`);

  // Batch updates
  let updated = 0;
  const BATCH = 100;

  for (let i = 0; i < bots.length; i += BATCH) {
    const batch = bots.slice(i, i + BATCH);
    await Promise.all(
      batch.map((bot, j) =>
        prisma.user.update({
          where: { id: bot.id },
          data: { name: pool[i + j] },
        })
      )
    );
    updated += batch.length;
    process.stdout.write(`\r  Updated ${updated}/${bots.length}`);
  }

  console.log(`\n\n✅ Renamed ${updated} bot users`);

  // Show a sample
  const sample = pool.slice(0, 20);
  console.log("  Sample names:", sample.join(", "));
}

main()
  .catch(e => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
