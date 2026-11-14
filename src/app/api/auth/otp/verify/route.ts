import { NextResponse, type NextRequest } from "next/server";
import { one, run } from "@/lib/db";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { ROLE_HOME } from "@/lib/constants";
import { nowIso } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { otpVerifySchema } from "@/lib/validation";
import { createSupabaseClient } from "@/lib/supabase";
import { matchesLoginRole } from "@/lib/auth";
import type { Role } from "@/types";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const ip = clientIp(req);
  if (!(await rateLimit(`otp-verify:${ip}`, 15, 15 * 60 * 1000)).allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait 15 minutes." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = otpVerifySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check your details." }, { status: 400 });
  }
  const { email, code, purpose, role } = parsed.data;

  let supabase;
  try {
    supabase = await createSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase Auth is not configured." },
      { status: 503 },
    );
  }

  const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: purpose === "login" ? "email" : "signup",
  });
  if (verifyError || !authData.user?.email) {
    return NextResponse.json(
      { error: verifyError?.message || "That code is invalid or has expired. Request a new one." },
      { status: 400 },
    );
  }

  const user = await one<{
    id: string;
    email: string;
    role: Role;
    status: string;
    full_name: string;
    is_demo: number;
  }>(
    "SELECT id, email, role, status, full_name, is_demo FROM users WHERE lower(email) = ?",
    authData.user.email.toLowerCase(),
  );
  if (!user) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json({ error: "Your account has no EcoCampus profile. Contact an administrator." }, { status: 403 });
  }
  if (user.is_demo === 1) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json({ error: "Demo profiles cannot sign in." }, { status: 403 });
  }
  await run("UPDATE users SET email_verified = 1, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?", nowIso(), user.id);
  if (purpose === "login" && !matchesLoginRole(user.role, role)) {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) console.error("Could not clear a role-mismatched OTP session:", error.message);
    return NextResponse.json(
      { error: `This account is registered for the ${user.role === "super_admin" ? "admin" : user.role} portal.` },
      { status: 403 },
    );
  }

  if (purpose === "verify") {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      console.error("Could not clear the session after email verification:", error.message);
      return NextResponse.json({ error: "Email verified, but sign-out failed. Please sign out before continuing." }, { status: 500 });
    }
    await logAudit({
      action: "Email verified",
      entityType: "user",
      entityId: user.id,
      details: user.email,
      ip,
    });
    return NextResponse.json({
      ok: true,
      verified: true,
      pendingApproval: user.status === "pending",
      message:
        user.status === "pending"
          ? "Email verified. Your staff account is now awaiting administrator approval."
          : "Email verified. You can now sign in.",
    });
  }

  if (user.status === "suspended" || user.status === "deleted" || user.status === "pending") {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) console.error("Could not clear a blocked OTP session:", error.message);
    return NextResponse.json(
      {
        error:
          user.status === "pending"
            ? "Your staff account is awaiting administrator approval."
            : "This account cannot sign in. Contact a platform administrator.",
      },
      { status: 403 },
    );
  }

  await logAudit({
    action: "User signed in (one-time code)",
    entityType: "user",
    entityId: user.id,
    details: `${user.role} · ${user.email}`,
    ip,
  });
  return NextResponse.json({
    ok: true,
    role: user.role,
    redirect: ROLE_HOME[user.role] ?? "/",
    name: user.full_name,
  });
}
