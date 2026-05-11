export const BETA_ONLY_MODE = process.env.BETA_ONLY_MODE === "true";

export const BETA_ACCESS_ERROR =
  "This private beta is limited to approved tester accounts.";

export const BETA_REGISTER_ERROR =
  "Closed Testing in progress. If you would like to be a tester please email support@puzzlewarz.com.";

const betaAllowlistEmails = new Set(
  (process.env.BETA_ALLOWLIST_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export function isBetaAllowlistedEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return betaAllowlistEmails.has(email.trim().toLowerCase());
}

export function hasBetaAccess(user: {
  email?: string | null;
  role?: string | null;
  betaApproved?: boolean | null;
}) {
  if (!BETA_ONLY_MODE) {
    return true;
  }

  if (user.role === "admin") {
    return true;
  }

  if (user.betaApproved === true) {
    return true;
  }

  return isBetaAllowlistedEmail(user.email);
}