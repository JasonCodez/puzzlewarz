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
  // Gaming / tech vibe
  "Shadow","Cipher","Pixel","Neon","Glitch","Rogue","Frost","Void","Byte","Vex",
  "Hex","Echo","Blaze","Phantom","Storm","Iron","Ghost","Nova","Arc","Nebula",
  "Ember","Flux","Drift","Pulse","Prism","Static","Vector","Binary","Wraith","Raven",
  // Personality / mood
  "Lazy","Lucky","Silent","Golden","Wild","Cozy","Smooth","Sleepy","Salty","Bold",
  "Sharp","Quick","Tiny","Fuzzy","Calm","Broken","Hidden","Lost","Ancient","Empty",
  "Bright","Bitter","Hollow","Rusty","Cloudy","Crispy","Frozen","Dusty","Gloomy","Stray",
  // Colour / nature
  "Misty","Rainy","Arctic","Desert","Sunset","Starry","Amber","Cobalt","Indigo","Teal",
  "Scarlet","Violet","Ivory","Sage","Dusk","Crimson","Azure","Lunar","Solar","Mossy",
  // Punchy cool words
  "Blitz","Surge","Cryo","Arcane","Neural","Quantum","Onyx","Apex","Zenith","Omega",
];

const WORDS_B = [
  // Animals — extremely common in real usernames
  "Wolf","Fox","Hawk","Cat","Crow","Bear","Shark","Eagle","Panda","Raccoon",
  "Turtle","Bunny","Moose","Seal","Crab","Otter","Lynx","Ferret","Moth","Swan",
  "Gecko","Bison","Frog","Elk","Koi","Vole","Quail","Mink","Heron","Newt",
  // Food — very popular in real player names
  "Noodle","Taco","Muffin","Waffle","Ramen","Boba","Bagel","Pickle","Toast","Donut",
  "Dumpling","Biscuit","Nacho","Sushi","Peach","Plum","Mango","Gummy","Pretzel","Chip",
  // Everyday objects / vibes
  "Brick","Lamp","Lens","Mug","Rock","Coin","Flag","Bolt","Cog","Cloud",
  "Cactus","Pebble","Wrench","Dial","Sock","Knot","Loop","Snap","Bloom","Shard",
  // Gaming roles (diverse)
  "Hunter","Seeker","Knight","Scout","Ninja","Ranger","Wizard","Archer","Warden","Bard",
  "Lancer","Paladin","Monk","Assassin","Duelist","Cleric","Druid","Rogue","Sniper","Pilot",
  // Internet / player culture
  "Grinder","Lurker","Tryhard","Casual","Clutch","Carry","Noob","Nerd","Geek","Smurf",
];

const FIRST_NAMES = [
  "jake","tyler","mason","logan","ethan","liam","noah","aiden","caleb","lucas",
  "ryan","dylan","cole","adam","sean","alex","jay","kai","drew","max",
  "riley","morgan","jordan","casey","avery","taylor","reese","quinn","blake","sage",
  "maya","aria","luna","zoe","mia","elena","nova","ivy","jade","ruby",
  "sam","cam","ash","nick","ben","tom","lee","dan","rob","chris",
];

const SHORT_NUMBERS = [
  "","","","","","","","","","", // 10 empty = ~40% get no number
  "2","3","7","9","11","13","21","23","27","33",
  "42","47","64","69","77","88","99","100","101",
  "123","404","420","777","999","007","1337",
];

const SPECIAL_PREFIXES = [
  "x","X","i","o","v","The","Itz","Its","Real","Not","Just","Dark","Ultra",
];

const SUFFIX_WORDS = [
  "Pro","GG","WZ","PW","Ace","Rex","Max","OP","XL","OG",
  "Jr","Sr","II","III","IV","HD","XD","FPS","RPG",
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

  const patterns: ((i: number) => string)[] = [
    // 0: Simple compound — "ShadowWolf" / "LazyFox" / "FrozenCrab"
    (i) => mixedCase(pick(WORDS_A, i * 7) + pick(WORDS_B, i * 13), i),

    // 1: Compound + number — "CipherFox99" / "FrozenCrab42"
    (i) => mixedCase(pick(WORDS_A, i * 11) + pick(WORDS_B, i * 17), i) + pick(SHORT_NUMBERS.filter(n => n !== ""), i * 3),

    // 2: Single word + number — "Phantom42" / "Noodle99" / "Taco7"
    (i) => pick([...WORDS_A, ...WORDS_B], i * 19) + pick(["2","3","7","9","11","21","42","69","77","88","99","100","404","777"], i * 5),

    // 3: First name + number — "jake42" / "riley2007" / "sam99"
    (i) => pick(FIRST_NAMES, i * 23) + pick(["2","3","7","9","11","21","42","47","69","77","88","99","100","2004","2005","2006","2007","2008","2009","2010"], i * 29),

    // 4: Compound + suffix — "VoidWolfGG" / "SilentCatPro"
    (i) => pick(WORDS_A, i * 37) + pick(WORDS_B, i * 41) + pick(SUFFIX_WORDS, i * 43),

    // 5: Two A words — "ShadowVoid" / "LazyFrost" / "WildCrimson"
    (i) => mixedCase(pick(WORDS_A, i * 47) + pick(WORDS_A, i * 53), i),

    // 6: Lowercase A+B with optional number — "lazywolf" / "frozencrab99"
    (i) => (pick(WORDS_A, i * 59) + pick(WORDS_B, i * 61)).toLowerCase() + pick(["","","","7","9","77","99","42","100","404"], i * 67),

    // 7: B word + suffix — "TacoGG" / "NoodleXD" / "WolfPro"
    (i) => pick(WORDS_B, i * 71) + pick(SUFFIX_WORDS, i * 73),

    // 8: "its" + first name — "itsryan" / "itsmorgan"
    (i) => "its" + pick(FIRST_NAMES, i * 79),

    // 9: first name + short tag — "jake_x" / "riley_gg" / "sam_pw"
    (i) => pick(FIRST_NAMES, i * 83) + "_" + pick(["x","z","k","w","gg","pw","real","og","pro","ace"], i * 89),

    // 10: A word + casual animal/noun — "lazycat" / "frozenpanda" / "wildblob"
    (i) => mixedCase(pick(WORDS_A, i * 97) + pick(["cat","panda","fox","bee","kid","dude","guy","doge","blob","rat"], i * 101), i),

    // 11: Special prefix + first name — "xjake" / "TheRiley" / "ItsNova"
    (i) => {
      const pre = pick(SPECIAL_PREFIXES, i * 103);
      const fn  = pick(FIRST_NAMES, i * 107);
      return pre.length === 1 ? pre + fn : pre + fn.charAt(0).toUpperCase() + fn.slice(1);
    },
  ];

  let i = 0;
  let attempts = 0;

  while (names.length < count && attempts < count * 20) {
    const patternIdx = i % patterns.length;
    let name = patterns[patternIdx](i);

    // If colliding, append a short disambiguator number
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
