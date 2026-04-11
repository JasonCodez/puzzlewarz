import { Resend } from "resend";

// Re-export all email templates from the dedicated module
export {
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
  generateStreakExpiryEmail,
  getDifficultyColor,
} from "./email-templates";
export type { StoreSaleItem } from "./email-templates";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Preferred: Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM || "Puzzle Warz <admin@send.puzzlewarz.com>";

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        console.error("Failed to send email (Resend):", error);
        return false;
      }

      console.info("Resend email sent", {
        to: options.to,
        subject: options.subject,
        id: data?.id,
      });

      return true;
    }

    console.warn("Email service not configured. Set RESEND_API_KEY in .env.local");
    return false;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}
