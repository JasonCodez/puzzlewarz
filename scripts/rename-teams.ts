/**
 * rename-teams.ts
 * Updates all bot-created teams with better names and unique descriptions.
 *
 * Run:  npx tsx scripts/rename-teams.ts
 */

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

// ─── Name pool ────────────────────────────────────────────────────────────────

const TEAM_NAMES: string[] = [
  // Self-deprecating / relatable
  "We Tried", "Skill Issue", "Send Help", "Barely Functional", "Just Vibes",
  "Currently Spiraling", "Low Expectations", "Don't Ask", "Absolutely Not",
  "Still Loading", "Almost There", "Kind Of Trying", "Good Enough",
  "Needs Improvement", "Average At Best", "Getting There", "Probably Fine",
  "Room For Growth", "Not Our Best", "It Happens",
  // Puzzle-specific humor
  "One More Puzzle", "No Hints Needed", "Wrong Again", "Last Attempt",
  "Blind Solve", "Going With Gut", "Overthought It", "The Overthinkers",
  "Mind Palace", "Wrong Answer Gang", "Red Herring Hunters",
  "Actually Read The Instructions", "The Decoders", "Pattern Spotters",
  "The Backspacers", "Wild Guess", "Pure Instinct", "Slow Burn",
  // Group / friend group vibe
  "The Usual Suspects", "The Regulars", "Night Owls", "The Committee",
  "Off The Clock", "Chaos Crew", "The Wanderers", "Plot Twist",
  "Main Characters", "Side Quests", "The Newcomers", "Weekend Warriors",
  "Midnight Crew", "The Skeptics", "Puzzle Club", "The Late Shift",
  "Early Birds", "Making It Up", "The Think Tank", "Brain Trust",
  "Certified Nerds", "The Analysts", "Running On Fumes", "Coffee Required",
  "No Drama", "The Round Table", "The Stragglers",
  // Competitive but grounded
  "Not Last Place", "Solidly Mid", "The Point Chasers", "Streak Defenders",
  "The Grind", "We've Been Practicing", "Genuinely Competitive",
  "Clutch (Sometimes)", "Podium Or Bust", "The Real Finals",
  "Top 10 Or Bust", "Extremely Normal About Points",
  // Casual / fun
  "Touch Grass", "Chronically Online", "Big Brain Energy",
  "Technically Correct", "Professional Guessers", "We Don't Sleep",
  "Needs More Coffee", "The Doomscrollers", "Rabbit Hole",
  "Ctrl Alt Delete", "Mind The Gap", "Dead Drop", "Carry Me",
  "First Blood", "Cold Start", "Null Island", "Silent Keys", "No Hints",
];

// ─── Description pool ─────────────────────────────────────────────────────────

const TEAM_DESCRIPTIONS: string[] = [
  "started as 3 friends who couldn't stop playing. now there's like 9 of us and none of us talk about anything else anymore",
  "we made this team after losing a warz challenge and refusing to accept it. the grudge match is still ongoing",
  "honestly we just wanted a team name. stayed for the gridlock grind",
  "met in the forum complaining about the same puzzle. decided to just start solving together instead",
  "my friend bet me I couldn't crack the daily streak record. I made a team to prove a point. he joined later",
  "we don't have a strategy. we just send it and hope for the best. so far so good",
  "came for the puzzles, stayed because we accidentally got into the top 20 and now we can't leave",
  "none of us are that good individually but together we're somehow unstoppable. usually",
  "we call ourselves casual but we're literally on here every day so make of that what you will",
  "team chat is mostly memes and the occasional 'oh wait I got it'",
  "formed because we kept running into each other on the leaderboard and figured we should just team up",
  "we grind the daily puzzle together and compare streaks every morning like completely normal people",
  "someone made the team as a joke and then six people joined in 24 hours. here we are",
  "originally just two of us. then we started winning and people started asking to join",
  "we bonded over both guessing the same wrong answer on frequency. it felt like fate",
  "found each other through the leaderboard. turns out we were all working from the same coffee shop",
  "this team started as a bet. the bet was whether we could stay in top 50. we are extremely invested now",
  "we take the puzzles seriously and the team name not seriously at all",
  "daily puzzle streak is non-negotiable. if you skip, you explain yourself in the group chat",
  "we rotate who does the gridlock each day so no one person carries the streak",
  "our rule: no hints before you've tried for at least 20 minutes. yes we enforce this",
  "lost the weekly leaderboard by 4 points once. it haunts us. we do not talk about it",
  "three of us are ex-competitive gamers who redirected the energy here. results have been mixed",
  "we keep a running doc of every puzzle we've failed. it's a very long doc",
  "warz challenges are our main thing. we rarely turn one down",
  "we share hints in the group chat but only after everyone has genuinely tried first",
  "monthly leaderboard is the only one that matters to us. weekly is just warmup",
  "we have a whole spreadsheet tracking which puzzle types we're weakest at. yes really",
  "we assign puzzles based on who's best at what. it works better than it sounds",
  "we each have a specialty. one of us is suspiciously good at the witness puzzles. no one asks why",
  "if you go three days without solving something you get a strongly worded message. it's a feature",
  "leaderboard or nothing. if we're not climbing we're regrouping",
  "we time everything. every solve, every hint, every attempt. data doesn't lie",
  "some teams treat this like a hobby. we treat it like a sport",
  "our team founder has completed every puzzle on this site. we have not. they carry us gracefully",
  "we are extremely normal about points and definitely don't check the leaderboard at 2am",
  "top of the weekly leaderboard three times running. we do not accept fourth place",
  "we've been on a winning streak long enough that losing now would genuinely hurt",
  "quietly competitive. we don't trash talk. we just win and say nothing",
  "all skill levels welcome. the only requirement is you actually show up",
  "we celebrate every solve no matter how long it took or how many hints were used",
  "new to the platform? this is a good first team. we'll walk you through it",
  "no pressure, no drama, just puzzles and decent vibes",
  "we don't care how good you are. we care that you're having fun",
  "everyone contributes differently. some of us solve fast, some of us just bring energy to the call",
  "our team has solved the hardest puzzle on the site and also spent 40 minutes on a beginner one. we contain multitudes",
  "we have a rule against complaining about puzzle difficulty. we break it every single day",
  "the team name was the hardest puzzle we've ever solved",
  "at some point this stopped being casual. we don't know when that happened",
  "one of us does not sleep. we don't know who it is. the streak data is suspicious",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Find all bot user IDs
  const bots = await prisma.user.findMany({
    where: { isBot: true },
    select: { id: true },
  });
  const botIds = bots.map((b) => b.id);

  if (botIds.length === 0) {
    console.log("No bot users found.");
    return;
  }

  // Find all teams whose creator is a bot
  const botTeams = await prisma.team.findMany({
    where: { createdBy: { in: botIds } },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  if (botTeams.length === 0) {
    console.log("No bot-created teams found.");
    return;
  }

  console.log(`Found ${botTeams.length} bot-created teams. Renaming...`);

  const names = shuffle(TEAM_NAMES);
  const descs = shuffle(TEAM_DESCRIPTIONS);

  let updated = 0;
  for (let i = 0; i < botTeams.length; i++) {
    const team = botTeams[i];
    const newName =
      i < names.length
        ? names[i]
        : `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`;
    const newDesc = descs[i % descs.length];

    await prisma.team.update({
      where: { id: team.id },
      data: { name: newName, description: newDesc },
    });

    updated++;
    if (updated % 10 === 0) {
      console.log(`  ${updated}/${botTeams.length} updated...`);
    }
  }

  console.log(`Done. ${updated} teams renamed.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
