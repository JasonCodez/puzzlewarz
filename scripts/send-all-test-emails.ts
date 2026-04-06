import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { sendEmail } from "../src/lib/mail";
import {
  generateWelcomeEmail,
  generateEmailVerificationEmail,
  generatePasswordResetEmail,
  generatePuzzleReleaseEmail,
  generateAchievementEmail,
  generateTeamUpdateEmail,
  generateTeamLobbyInviteEmail,
  generateLeaderboardEmail,
  generateWarzChallengeEmail,
  generateStoreSaleEmail,
} from "../src/lib/email-templates";

// Load env vars
const projectRoot = path.resolve(__dirname, "..");
for (const f of [".env.local", ".env"]) {
  const p = path.join(projectRoot, f);
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

const BASE = "https://puzzlewarz.com";
const TO = process.argv[2] || "admin@puzzlewarz.com";

interface TestEmail {
  subject: string;
  html: string;
}

const templates: TestEmail[] = [
  {
    subject: "[Test 1/10] Welcome Email",
    html: generateWelcomeEmail("PuzzleMaster", `${BASE}/dashboard`),
  },
  {
    subject: "[Test 2/10] Email Verification",
    html: generateEmailVerificationEmail("PuzzleMaster", `${BASE}/auth/verify?token=abc123`),
  },
  {
    subject: "[Test 3/10] Password Reset",
    html: generatePasswordResetEmail("PuzzleMaster", `${BASE}/auth/reset-password?token=xyz789`),
  },
  {
    subject: "[Test 4/10] New Puzzle Released",
    html: generatePuzzleReleaseEmail("PuzzleMaster", "Escape the Labyrinth", `${BASE}/puzzles/escape-labyrinth`, "HARD", 500),
  },
  {
    subject: "[Test 5/10] Achievement Unlocked",
    html: generateAchievementEmail("PuzzleMaster", "Speed Demon", "Completed 10 puzzles in under 5 minutes each", `${BASE}/images/badges/speed-demon.png`),
  },
  {
    subject: "[Test 6/10] Team Update",
    html: generateTeamUpdateEmail("PuzzleMaster", "Cipher Squad", "New Member Joined!", "Welcome our newest member — they're ready to puzzle!", `${BASE}/teams/cipher-squad`),
  },
  {
    subject: "[Test 7/10] Team Lobby Invite",
    html: generateTeamLobbyInviteEmail("PuzzleMaster", "CryptoKing", "Cipher Squad", "Sudoku Showdown", `${BASE}/team/lobby/abc123`),
  },
  {
    subject: "[Test 8/10] Leaderboard Update",
    html: generateLeaderboardEmail("PuzzleMaster", "global", 5, 12, 8750, `${BASE}/leaderboard`),
  },
  {
    subject: "[Test 9/10] Warz Challenge",
    html: generateWarzChallengeEmail("PuzzleMaster", "ShadowSolver", "Cryptic Crossword #42", `${BASE}/challenge/xyz`, 250),
  },
  {
    subject: "[Test 10/10] Point Store Sale",
    html: generateStoreSaleEmail(
      "PuzzleMaster",
      "Weekend Flash Sale!",
      [
        { name: "Neon Theme", originalPrice: 500, salePrice: 250 },
        { name: "Gold Card Frame", originalPrice: 800, salePrice: 400 },
        { name: "Crimson Profile Skin", originalPrice: 600, salePrice: 300 },
      ],
      `${BASE}/store`,
      "April 7, 2026 at 11:59 PM"
    ),
  },
];

async function main() {
  console.log(`\nSending ${templates.length} test emails to: ${TO}\n`);

  let sent = 0;
  let failed = 0;

  for (const tpl of templates) {
    process.stdout.write(`  ${tpl.subject} ... `);
    const ok = await sendEmail({ to: TO, subject: tpl.subject, html: tpl.html });
    if (ok) {
      console.log("✓ sent");
      sent++;
    } else {
      console.log("✗ FAILED");
      failed++;
    }
  }

  console.log(`\nDone: ${sent} sent, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
