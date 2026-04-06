import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

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
  getDifficultyColor,
} from "./email-templates";
export type { StoreSaleItem } from "./email-templates";

// Initialize email transporter (configure with your SMTP settings)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Email sending is disabled during development. To re-enable, uncomment the code below.
  console.info("[mail] Email sending is currently DISABLED. No email sent.");
  return false;

  try {
    // Preferred: SendGrid Web API
    if (process.env.SENDGRID_API_KEY) {
      const fromEmail = process.env.SENDGRID_FROM || process.env.SMTP_FROM || "";
      if (!fromEmail) {
        console.warn("SENDGRID_FROM is not set; cannot send email.");
        return false;
      }

      sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);
      const [resp] = await sgMail.send({
        to: options.to,
        from: { email: fromEmail as string, name: "Puzzle Warz" },
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      const headers = (resp as unknown as { headers?: Record<string, string> })?.headers;
      const messageId = headers?.["x-message-id"] || headers?.["X-Message-Id"];
      console.info("SendGrid email sent", {
        to: options.to,
        subject: options.subject,
        messageId,
      });

      return true;
    }

    // Fallback: SMTP (Nodemailer)
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.warn("Email service not configured. Skipping email send.");
      return false;
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `Puzzle Warz <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.info("SMTP email sent", {
      to: options.to,
      subject: options.subject,
      messageId: (info as unknown as { messageId?: string })?.messageId,
    });

    return true;
  } catch (error) {
    const sendgridError = error as {
      code?: number | string;
      message?: string;
      response?: { statusCode?: number; body?: unknown };
    };
    if (sendgridError?.response?.body) {
      console.error("Failed to send email (SendGrid):", {
        statusCode: sendgridError.response?.statusCode,
        body: sendgridError.response?.body,
      });
    } else {
      console.error("Failed to send email:", error);
    }
    return false;
  }
}
