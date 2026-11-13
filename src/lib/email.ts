import "server-only";
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { one, run } from "@/lib/db";
import { escapeHtml, nowIso } from "@/lib/utils";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function emailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(to: string, subject: string, text: string) {
  const id = randomUUID();
  const createdAt = nowIso();
  const html = `<div style="font-family:Inter,Segoe UI,sans-serif;max-width:600px;margin:auto;padding:28px;color:#1d2624">
    <div style="font-size:20px;font-weight:700;color:#14532D">EcoCampus AI</div>
    <p style="color:#6b7a76;margin-top:4px">Smart Environmental Management System</p>
    <hr style="border:none;border-top:1px solid #e6ebe9;margin:20px 0" />
    <div style="white-space:pre-wrap;line-height:1.65">${escapeHtml(text)}</div>
    <hr style="border:none;border-top:1px solid #e6ebe9;margin:20px 0" />
    <p style="font-size:12px;color:#8b9995">This message relates to an independent campus environmental management project.</p>
  </div>`;

  run(
    "INSERT INTO email_outbox (id, to_email, subject, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    id,
    to,
    subject,
    text,
    "logged",
    createdAt,
  );

  if (!emailDeliveryConfigured()) {
    return { id, delivered: false, mode: "outbox" as const };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject,
        text,
        html,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      run(
        "UPDATE email_outbox SET status = 'failed', error = ? WHERE id = ?",
        detail.slice(0, 500),
        id,
      );
      return { id, delivered: false, mode: "failed" as const };
    }
    run("UPDATE email_outbox SET status = 'sent', sent_at = ? WHERE id = ?", nowIso(), id);
    return { id, delivered: true, mode: "email" as const };
  } catch (error) {
    run(
      "UPDATE email_outbox SET status = 'failed', error = ? WHERE id = ?",
      String(error).slice(0, 500),
      id,
    );
    return { id, delivered: false, mode: "failed" as const };
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createEmailToken(userId: string, type: "verify" | "reset" | "magic") {
  run("DELETE FROM email_tokens WHERE user_id = ? AND type = ?", userId, type);
  const raw = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  run(
    `INSERT INTO email_tokens (id, user_id, type, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    userId,
    type,
    hashToken(raw),
    expires,
    nowIso(),
  );
  return raw;
}

export function consumeEmailToken(raw: string, type: "verify" | "reset" | "magic") {
  const row = one<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    "SELECT * FROM email_tokens WHERE token_hash = ? AND type = ?",
    hashToken(raw),
    type,
  );
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) return null;
  run("UPDATE email_tokens SET used_at = ? WHERE id = ?", nowIso(), row.id);
  return row.user_id;
}

const OTP_MINUTES = 10;

/** Create a 6-digit one-time code for a user. The hash is salted with the user id,
 * so identical codes across accounts cannot collide in the unique token_hash column. */
export function createOtp(userId: string, type: "otp_verify" | "otp_login") {
  run("DELETE FROM email_tokens WHERE user_id = ? AND type = ?", userId, type);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const tokenHash = createHash("sha256").update(`${userId}:${code}`).digest("hex");
  const expires = new Date(Date.now() + OTP_MINUTES * 60 * 1000).toISOString();
  run(
    `INSERT INTO email_tokens (id, user_id, type, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    userId,
    type,
    tokenHash,
    expires,
    nowIso(),
  );
  return code;
}

export function consumeOtp(userId: string, code: string, type: "otp_verify" | "otp_login") {
  const tokenHash = createHash("sha256").update(`${userId}:${code}`).digest("hex");
  const row = one<{ id: string; expires_at: string; used_at: string | null }>(
    "SELECT id, expires_at, used_at FROM email_tokens WHERE token_hash = ? AND type = ? AND user_id = ?",
    tokenHash,
    type,
    userId,
  );
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) return false;
  run("UPDATE email_tokens SET used_at = ? WHERE id = ?", nowIso(), row.id);
  return true;
}

export function verificationUrl(token: string) {
  return `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
}

export function resetUrl(token: string) {
  return `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

export function magicUrl(token: string) {
  return `${appUrl()}/api/auth/magic?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationEmail(email: string, name: string) {
  const user = one<{ id: string }>("SELECT id FROM users WHERE email = ?", email);
  if (!user) return { mode: "outbox" as const, delivered: false, url: "", code: "" };
  const token = createEmailToken(user.id, "verify");
  const code = createOtp(user.id, "otp_verify");
  const url = verificationUrl(token);
  const result = await sendEmail(
    email,
    "Verify your EcoCampus AI email",
    `Hello ${name},\n\nWelcome to EcoCampus AI. Verify your email in either of these ways:\n\n1. Enter this 6-digit code on the verification page (valid ${OTP_MINUTES} minutes):\n\n    ${code}\n\n2. Or open this one-time verification link:\n${url}\n\nIf you did not create this account, you can ignore this message.`,
  );
  return { ...result, url, code };
}

export async function sendResetEmail(email: string, name: string) {
  const user = one<{ id: string }>("SELECT id FROM users WHERE email = ?", email);
  if (!user) return { mode: "outbox" as const, delivered: false, url: "" };
  const token = createEmailToken(user.id, "reset");
  const url = resetUrl(token);
  const result = await sendEmail(
    email,
    "Reset your EcoCampus AI password",
    `Hello ${name},\n\nUse this link to reset your password:\n${url}\n\nThis link expires in 24 hours. If you did not request it, no action is required.`,
  );
  return { ...result, url };
}

export function appBaseUrl() {
  return appUrl();
}

export function appBaseUrlForRequest(requestUrl: URL) {
  if (
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(requestUrl.hostname)
  ) {
    return requestUrl.origin;
  }
  return appBaseUrl();
}

export type OtpPurpose = "login" | "verify";

/** Send a 6-digit code plus a magic link for passwordless sign-in or email verification. */
export async function sendOtpEmail(email: string, purpose: OtpPurpose) {
  const user = one<{ id: string; full_name: string }>("SELECT id, full_name FROM users WHERE email = ?", email);
  if (!user) return null;
  const otpType = purpose === "login" ? ("otp_login" as const) : ("otp_verify" as const);
  const code = createOtp(user.id, otpType);
  let url = "";
  let subject = "";
  let body = "";
  if (purpose === "login") {
    url = magicUrl(createEmailToken(user.id, "magic"));
    subject = "Your EcoCampus AI sign-in code";
    body = `Hello ${user.full_name},\n\nYour one-time sign-in code is:\n\n    ${code}\n\nIt expires in ${OTP_MINUTES} minutes and can be used once. You can also sign in by opening this link:\n${url}\n\nIf you did not request this code, you can safely ignore this email.`;
  } else {
    url = verificationUrl(createEmailToken(user.id, "verify"));
    subject = "Verify your EcoCampus AI email";
    body = `Hello ${user.full_name},\n\nYour email verification code is:\n\n    ${code}\n\nIt expires in ${OTP_MINUTES} minutes and can be used once. You can also verify by opening this link:\n${url}\n\nIf you did not create this account, you can ignore this email.`;
  }
  const result = await sendEmail(email, subject, body);
  return { delivered: result.delivered, mode: result.mode, url, code };
}
