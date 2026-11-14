import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation";
import { one, run } from "@/lib/db";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { ROLE_HOME } from "@/lib/constants";
import { nowIso } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { createSupabaseClient } from "@/lib/supabase";
import { matchesLoginRole } from "@/lib/auth";
import type { Role } from "@/types";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const ip = clientIp(req);
  if (!(await rateLimit(`login:${ip}`, 20, 15 * 60 * 1000)).allowed) {
    return NextResponse.json({ error: "Too many sign-in attempts. Please wait 15 minutes." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check your details." }, { status: 400 });
  }
  const { email, password, role } = parsed.data;
  if (!(await rateLimit(`login-email:${email}`, 8, 15 * 60 * 1000)).allowed) {
    return NextResponse.json({ error: "Too many attempts for this account. Please wait." }, { status: 429 });
  }
  let supabase;
  try {
    supabase = await createSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase Auth is not configured." },
      { status: 503 },
    );
  }

  const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !data.user?.email) {
    const needsVerification = authError?.code === "email_not_confirmed";
    return NextResponse.json(
      {
        error: needsVerification
          ? "Please verify your email before signing in. Enter the verification code sent to your inbox."
          : authError?.message || "Supabase could not sign you in.",
        needsVerification,
      },
      { status: needsVerification ? 403 : 401 },
    );
  }

  const user = await one<{
    id: string;
    email: string;
    full_name: string;
    role: Role;
    status: string;
    is_demo: number;
  }>(
    "SELECT id, email, full_name, role, status, is_demo FROM users WHERE lower(email) = ?",
    data.user.email.toLowerCase(),
  );
  if (!user) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json(
      { error: "Your Supabase account has no EcoCampus profile. Contact an administrator." },
      { status: 403 },
    );
  }
  if (user.is_demo === 1) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json(
      { error: "Demo profiles cannot sign in. Use an account created through registration or Admin setup." },
      { status: 403 },
    );
  }
  if (!matchesLoginRole(user.role, role)) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json(
      { error: `This account is registered for the ${user.role === "super_admin" ? "admin" : user.role} portal.` },
      { status: 403 },
    );
  }
  if (user.status === "suspended" || user.status === "deleted") {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json(
      { error: "This account cannot sign in. Contact a platform administrator." },
      { status: 403 },
    );
  }
  if (user.status === "pending") {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json(
      { error: "Your staff account is awaiting administrator approval." },
      { status: 403 },
    );
  }
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json(
      { error: "Please verify your email before signing in. Request a new code if needed.", needsVerification: true },
      { status: 403 },
    );
  }

  try {
    await run(
      "UPDATE users SET email_verified = 1, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
      nowIso(),
      user.id,
    );
  } catch (updateError) {
    console.error("Could not update the sign-in timestamp:", updateError);
  }
  try {
    await logAudit({
      action: "User signed in",
      entityType: "user",
      entityId: user.id,
      details: `${user.role} · ${email}`,
      ip,
    });
  } catch (auditError) {
    console.error("Could not write the sign-in audit entry:", auditError);
  }

  return NextResponse.json({
    ok: true,
    role: user.role,
    redirect: ROLE_HOME[user.role] ?? "/",
    name: user.full_name,
  });
}
