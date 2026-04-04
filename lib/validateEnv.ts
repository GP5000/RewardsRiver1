/**
 * lib/validateEnv.ts
 * Validates required environment variables at startup.
 * Import this at the top of server/db/connect.ts — runs before any DB connection.
 * Throws a clear error naming the missing variable rather than failing silently later.
 */

const REQUIRED_ENV_VARS = [
  "MONGODB_URI",
  "NEXTAUTH_SECRET",
  "NEXT_PUBLIC_ADMIN_EMAIL",
] as const;

// Optional in dev, required in production
const PROD_REQUIRED_ENV_VARS = [
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
] as const;

let validated = false;

export function validateEnv(): void {
  if (validated) return;

  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) missing.push(key);
  }

  if (process.env.NODE_ENV === "production") {
    for (const key of PROD_REQUIRED_ENV_VARS) {
      if (!process.env[key]) missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[RewardsRiver] Missing required environment variable(s): ${missing.join(", ")}\n` +
        `Check your .env.local file and ensure all required variables are set.`
    );
  }

  validated = true;
}
