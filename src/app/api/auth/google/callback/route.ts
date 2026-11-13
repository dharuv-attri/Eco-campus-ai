import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { one, run } from "@/lib/db";
import { createSupabaseClient } from "@/lib/supabase";
import { matchesLoginRole } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/constants";
import { clientIp } from "@/lib/http";
import { nowIso, sanitizeText } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import type { Role } from "@/types";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const nextPath = url.searchParams.get("next");
  const roleParam = url.searchParams.get("role");
  if (roleParam && !["student", "staff", "admin"].includes(roleParam)) {
    return NextResponse.redirect(new URL("/login?error=Invalid+portal+selection.", req.url));
  }
  const requestedRole = roleParam as "student" | "staff" | "admin" | null;
  const safeNextPath =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("\\")
      ? nextPath
      : undefined;
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");

  function failure(message: string) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, req.url));
  }

  if (oauthError) return failure(oauthError);
  const code = url.searchParams.get("code");
  if (!code) return failure("The Supabase sign-in callback did not include an authorization code. Try again.");

  let supabase;
  try {
    supabase = await createSupabaseClient();
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
    return NextResponse.redirect(new URL(safeNextPath, req.url));
  }

  const email = data.user.email.trim().toLowerCase();

  let profile = one<{ id: string; role: Role; status: string; is_demo: number }>(
    "SELECT id, role, status, is_demo FROM users WHERE lower(email) = ?",
    email,
  );
  if (!profile) {
    if (requestedRole && requestedRole !== "student") {
      await supabase.auth.signOut({ scope: "local" });
      return failure("No account exists for the selected portal. Ask an administrator if you need staff or admin access.");
    }
    if (getSettings().registration_open === "false") {
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
      run(
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
      profile = one<{ id: string; role: Role; status: string; is_demo: number }>(
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
    run("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?", nowIso(), profile.id);
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

  logAudit({
    action: "User signed in with Supabase",
    entityType: "user",
    entityId: profile.id,
    details: `${profile.role} · ${email}`,
    ip: clientIp(req),
  });

  return NextResponse.redirect(
    new URL(safeNextPath ?? ROLE_HOME[profile.role] ?? "/", req.url),
  );
}
