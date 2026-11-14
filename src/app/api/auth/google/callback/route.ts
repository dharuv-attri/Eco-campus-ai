import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import type { CookieOptions } from "@supabase/ssr";
import { one, run } from "@/lib/db";
import { appBaseUrlForRequest } from "@/lib/email";
import { createSupabaseClient } from "@/lib/supabase";
import { matchesLoginRole } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/constants";
import { clientIp } from "@/lib/http";
import { nowIso, sanitizeText } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import type { Role } from "@/types";

export async function GET(req: NextRequest) {
  const authCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];
  function withAuthCookies(response: NextResponse) {
    authCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

  const url = new URL(req.url);
  let baseUrl: string;
  try {
    baseUrl = appBaseUrlForRequest(req.nextUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The public site URL is not configured." },
      { status: 503 },
    );
  }
  const nextPath = url.searchParams.get("next");
  const roleParam = url.searchParams.get("role");
  if (roleParam && !["student", "staff", "admin"].includes(roleParam)) {
    return NextResponse.redirect(new URL("/login?error=Invalid+portal+selection.", baseUrl));
  }
  const requestedRole = roleParam as "student" | "staff" | "admin" | null;
  const safeNextPath =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("\\")
      ? nextPath
      : undefined;
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");

  function failure(message: string) {
    return withAuthCookies(
      NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(message)}`, baseUrl),
      ),
    );
  }

  if (oauthError) return failure(oauthError);
  const code = url.searchParams.get("code");
  if (!code) return failure("The Supabase sign-in callback did not include an authorization code. Try again.");

  let supabase;
  try {
    supabase = await createSupabaseClient({
      onCookiesSet: (cookiesToSet) => authCookies.push(...cookiesToSet),
    });
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Supabase Auth is not configured.");
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) {
    return failure(error?.message || "Supabase could not complete sign-in. Please try again.");
  }
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut({ scope: "local" });
    return failure("Verify your email before signing in.");
  }

  if (safeNextPath === "/reset-password") {
    return withAuthCookies(NextResponse.redirect(new URL(safeNextPath, baseUrl)));
  }

  const email = data.user.email.trim().toLowerCase();

  let profile = await one<{ id: string; role: Role; status: string; is_demo: number }>(
    "SELECT id, role, status, is_demo FROM users WHERE lower(email) = ?",
    email,
  );
  if (!profile) {
    if (requestedRole && requestedRole !== "student") {
      await supabase.auth.signOut({ scope: "local" });
      return failure("No account exists for the selected portal. Ask an administrator if you need staff or admin access.");
    }
    if ((await getSettings()).registration_open === "false") {
      await supabase.auth.signOut({ scope: "local" });
      return failure("New account registration is currently closed.");
    }
    const id = randomUUID();
    const metadata = data.user.user_metadata;
    const fullName = sanitizeText(
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.name === "string"
          ? metadata.name
          : email.split("@")[0],
    ).slice(0, 100);
    const image =
      typeof metadata.avatar_url === "string" ? sanitizeText(metadata.avatar_url).slice(0, 300) : null;
    try {
      await run(
        `INSERT INTO users (id, email, password_hash, role, full_name, profile_image, email_verified, status,
          provider, is_demo, created_at, updated_at)
         VALUES (?, ?, NULL, 'student', ?, ?, 1, 'active', 'google', 0, ?, ?)
         ON CONFLICT(email) DO NOTHING`,
        id,
        email,
        fullName,
        image,
        nowIso(),
        nowIso(),
      );
      profile = await one<{ id: string; role: Role; status: string; is_demo: number }>(
        "SELECT id, role, status, is_demo FROM users WHERE lower(email) = ?",
        email,
      );
    } catch (profileError) {
      console.error("Could not create the EcoCampus profile for the Supabase user:", profileError);
      await supabase.auth.signOut({ scope: "local" });
      return failure("Sign-in succeeded, but your EcoCampus profile could not be created. Contact an administrator.");
    }
    if (!profile) {
      await supabase.auth.signOut({ scope: "local" });
      return failure("Sign-in succeeded, but your EcoCampus profile could not be created. Contact an administrator.");
    }
  } else {
    await run("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?", nowIso(), profile.id);
  }

  if (profile.is_demo === 1) {
    await supabase.auth.signOut({ scope: "local" });
    return failure("Demo profiles cannot sign in. Create an account with a personal email address.");
  }

  if (!matchesLoginRole(profile.role, requestedRole || undefined)) {
    await supabase.auth.signOut({ scope: "local" });
    return failure(
      `This account is registered for the ${profile.role === "super_admin" ? "admin" : profile.role} portal.`,
    );
  }

  if (profile.status === "suspended" || profile.status === "deleted" || profile.status === "pending") {
    await supabase.auth.signOut({ scope: "local" });
    return failure(
      profile.status === "pending"
        ? "Your staff account is awaiting administrator approval."
        : "This account cannot sign in. Contact a platform administrator.",
    );
  }

  try {
    await logAudit({
      action: "User signed in with Supabase",
      entityType: "user",
      entityId: profile.id,
      details: `${profile.role} · ${email}`,
      ip: clientIp(req),
    });
  } catch (auditError) {
    // A failed audit write must never turn a successful sign-in into an error.
    console.error("Could not write the sign-in audit entry:", auditError);
  }

  return withAuthCookies(
    NextResponse.redirect(
      new URL(safeNextPath ?? ROLE_HOME[profile.role] ?? "/", baseUrl),
    ),
  );
}
