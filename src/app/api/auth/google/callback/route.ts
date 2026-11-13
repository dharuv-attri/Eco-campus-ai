import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { one, run } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { appBaseUrl } from "@/lib/email";
import { ROLE_HOME } from "@/lib/constants";
import { clientIp } from "@/lib/http";
import { nowIso } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cookieState = req.cookies.get("eco_oauth_state")?.value;
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");

  function failure(message: string) {
    const response = NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, req.url));
    response.cookies.set("eco_oauth_state", "", { path: "/", maxAge: 0 });
    return response;
  }

  if (oauthError) return failure("Google sign-in was cancelled.");
  if (!code || !state || !cookieState || state !== cookieState) {
    return failure("Google sign-in could not be verified. Please try again.");
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return failure("Google sign-in is not configured.");
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${appBaseUrl()}/api/auth/google/callback`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!tokenResponse.ok) return failure("Google sign-in failed while exchanging the authorization code.");
    const tokens = (await tokenResponse.json()) as { access_token?: string };
    if (!tokens.access_token) return failure("Google did not return an access token.");

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!profileResponse.ok) return failure("Could not read your Google profile.");
    const profile = (await profileResponse.json()) as {
      email?: string;
      email_verified?: boolean;
      name?: string;
      sub?: string;
    };
    if (!profile.email || !profile.email_verified) {
      return failure("Your Google email is not verified.");
    }
    const email = profile.email.toLowerCase();
    const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || "").trim().toLowerCase();
    if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
      return failure(`Please use a @${allowedDomain} email address.`);
    }

    let user = one<{ id: string; role: string; status: string }>(
      "SELECT id, role, status FROM users WHERE email = ?",
      email,
    );
    if (!user) {
      const id = randomUUID();
      run(
        `INSERT INTO users (id, email, password_hash, role, full_name, email_verified, status, provider, is_demo, created_at, updated_at)
         VALUES (?, ?, NULL, 'student', ?, 1, 'active', 'google', 0, ?, ?)`,
        id,
        email,
        (profile.name || email.split("@")[0]).slice(0, 100),
        nowIso(),
        nowIso(),
      );
      user = { id, role: "student", status: "active" };
    }
    if (user.status === "suspended") return failure("This account is suspended.");
    if (user.status === "pending") {
      return failure("Your staff account is awaiting administrator approval.");
    }

    await createSession(user.id, {
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
    });
    logAudit({
      action: "Google sign-in",
      entityType: "user",
      entityId: user.id,
      details: email,
      ip: clientIp(req),
    });

    const response = NextResponse.redirect(new URL(ROLE_HOME[user.role] ?? "/", req.url));
    response.cookies.set("eco_oauth_state", "", { path: "/", maxAge: 0 });
    return response;
  } catch {
    return failure("Google sign-in is temporarily unavailable. Please use email sign-in.");
  }
}
