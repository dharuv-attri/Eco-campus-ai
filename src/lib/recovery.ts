import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Short-lived, encrypted bridge between the OTP verification request and the
 * password update request.
 *
 * Supabase's recovery OTP returns a real auth session. We deliberately do not
 * put that session into the normal browser auth cookies (the user has not
 * finished resetting yet). Instead the tokens are sealed with AES-256-GCM in an
 * HttpOnly cookie that only the reset endpoint can read. The encryption key is
 * derived from server-only environment secrets, so the cookie contents are
 * useless to the browser or to anyone who copies it.
 */
export const RECOVERY_COOKIE = "ecocampus-recovery";
export const RECOVERY_TTL_MS = 10 * 60 * 1000;

export interface PendingRecovery {
  email: string;
  accessToken: string;
  refreshToken: string;
  exp: number;
}

function encryptionKey(): Buffer {
  const databaseUrl =
    process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
  const setupToken = process.env.ADMIN_SETUP_TOKEN?.trim() || "";
  const material = [databaseUrl, setupToken].filter(Boolean).join("|");
  if (!material) {
    throw new Error("The recovery link cannot be encrypted because no server secret is configured.");
  }
  return createHash("sha256").update(`ecocampus-recovery-v1|${material}`).digest();
}

export function sealRecoverySession(input: {
  email: string;
  accessToken: string;
  refreshToken: string;
}): string {
  const payload: PendingRecovery = {
    email: input.email.trim().toLowerCase(),
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    exp: Date.now() + RECOVERY_TTL_MS,
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(payload), "utf8")),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function openRecoverySession(value: string | undefined | null): PendingRecovery | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  try {
    const [ivPart, tagPart, ciphertextPart] = parts;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plaintext) as PendingRecovery;
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp < Date.now()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function recoveryCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/reset",
    maxAge: Math.floor(RECOVERY_TTL_MS / 1000),
  };
}
