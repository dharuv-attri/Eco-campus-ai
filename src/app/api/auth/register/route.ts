import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { registerSchema } from "@/lib/validation";
import { run, one } from "@/lib/db";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { nowIso, sanitizeText } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { appBaseUrlForRequest } from "@/lib/email";
import { createSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const ip = clientIp(req);
  if (!rateLimit(`register:${ip}`, 8, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many registration attempts. Try again later." }, { status: 429 });
  }

  if (getSettings().registration_open === "false") {
    return NextResponse.json({ error: "Registration is currently closed." }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check your details." }, { status: 400 });
  }
  const data = parsed.data;

  if (one("SELECT id FROM users WHERE lower(email) = ?", data.email)) {
    return NextResponse.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });
  }

  let departmentId: string | null = null;
  let departmentName = sanitizeText(data.department || "").slice(0, 120) || null;
  if (data.role === "staff") {
    if (!data.departmentId || !data.employeeId) {
      return NextResponse.json({ error: "Staff registration requires an employee ID and department." }, { status: 400 });
    }
    const department = one<{ id: string; name: string }>(
      "SELECT id, name FROM departments WHERE id = ?",
      data.departmentId,
    );
    if (!department) return NextResponse.json({ error: "Select a valid department." }, { status: 400 });
    departmentId = department.id;
    departmentName = department.name;
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

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: sanitizeText(data.fullName).slice(0, 100) },
      emailRedirectTo: `${appBaseUrlForRequest(req.nextUrl)}/api/auth/google/callback?next=/login`,
    },
  });
  if (authError) {
    return NextResponse.json({ error: authError.message || "Could not create your Supabase account." }, { status: 400 });
  }
  if (!authData.user?.email) {
    return NextResponse.json({ error: "Supabase did not return a user for this registration." }, { status: 502 });
  }
  if (authData.user.identities?.length === 0) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try signing in." },
      { status: 409 },
    );
  }

  const id = randomUUID();
  const verified = authData.user.email_confirmed_at ? 1 : 0;
  const status = data.role === "staff" ? "pending" : "active";
  try {
    run(
      `INSERT INTO users (id, email, password_hash, role, full_name, student_id, course, department, department_id,
        year_semester, employee_id, designation, email_verified, status, provider, is_demo, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'email', 0, ?, ?)`,
      id,
      data.email,
      data.role,
      sanitizeText(data.fullName).slice(0, 100),
      data.role === "student" ? sanitizeText(data.studentId || "").slice(0, 40) || null : null,
      data.role === "student" ? sanitizeText(data.course || "").slice(0, 120) || null : null,
      departmentName,
      departmentId,
      data.role === "student" ? sanitizeText(data.yearSemester || "").slice(0, 40) || null : null,
      data.role === "staff" ? sanitizeText(data.employeeId || "").slice(0, 40) || null : null,
      data.role === "staff" ? sanitizeText(data.designation || "").slice(0, 120) || null : null,
      verified,
      status,
      nowIso(),
      nowIso(),
    );
  } catch (error) {
    console.error("Supabase account was created but the EcoCampus profile could not be saved:", error);
    return NextResponse.json(
      { error: "Your Supabase account was created, but your EcoCampus profile could not be saved. Contact an administrator." },
      { status: 500 },
    );
  }

  if (authData.session) {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) console.error("Could not clear the session after signup:", error.message);
  }

  logAudit({
    action: data.role === "staff" ? "Staff registration submitted" : "Student registration",
    entityType: "user",
    entityId: id,
    details: data.email,
    ip,
  });

  return NextResponse.json({
    ok: true,
    requiresVerification: !verified,
    pendingApproval: data.role === "staff",
    email: data.email,
    message: verified
      ? data.role === "staff"
        ? "Account created. Staff access requires administrator approval before sign-in."
        : "Account created. You can now sign in."
      : "Account created. We sent a verification code to your email.",
  });
}
