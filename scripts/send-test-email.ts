import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { sendEmail } from "../src/lib/mail";

// Load env vars for CLI usage (Next.js loads these automatically, but tsx scripts do not).
const projectRoot = path.resolve(__dirname, "..");
const envLocalPath = path.join(projectRoot, ".env.local");
const envPath = path.join(projectRoot, ".env");

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: tsx scripts/send-test-email.ts <toEmail>");
    process.exit(1);
  }

  const ok = await sendEmail({
    to,
    subject: "Puzzle Warz: SendGrid integration test",
    html: "<p>This is a test email from Puzzle Warz.</p>",
    text: "This is a test email from Puzzle Warz.",
  });

  if (!ok) {
    console.error("Email send FAILED (check server logs for details).");
    process.exit(2);
  }

  console.log("Email send OK.");
}

main().catch((err) => {
  console.error(err);
  process.exit(3);
});
