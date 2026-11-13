import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { registerSchema } from "@/lib/validation";
import { run, one } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { nowIso, sanitizeText } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { emailDeliveryConfigured, sendVerificationEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const ip = clientIp(req);
  if (!rateLimit(`register:${ip}`, 8, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many registration attempts. Try again later." }, { status: 429 });
  }

  const settings = getSettings();
  if (settings.registration_open === "false") {
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
  const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || "").trim().toLowerCase();
  if (allowedDomain && !data.email.endsWith(`@${allowedDomain}`)) {
    return NextResponse.json(
      { error: `Please register with a @${allowedDomain} email address.` },
      { status: 400 },
    );
  }

  if (one("SELECT id FROM users WHERE email = ?", data.email)) {
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
    if (!department) {
      return NextResponse.json({ error: "Select a valid department." }, { status: 400 });
    }
    departmentId = department.id;
    departmentName = department.name;
  }

  const autoVerify = process.env.AUTO_VERIFY_EMAIL === "true";
  const status = data.role === "staff" ? "pending" : "active";
  const id = randomUUID();
  const hash = await hashPassword(data.password);

  run(
    `INSERT INTO users (id, email, password_hash, role, full_name, student_id, course, department, department_id,
      year_semester, employee_id, designation, email_verified, status, provider, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'email', 0, ?, ?)`,
    id,
    data.email,
    hash,
    data.role,
    sanitizeText(data.fullName).slice(0, 100),
    data.role === "student" ? sanitizeText(data.studentId || "").slice(0, 40) || null : null,
    data.role === "student" ? sanitizeText(data.course || "").slice(0, 120) || null : null,
    departmentName,
    departmentId,
    data.role === "student" ? sanitizeText(data.yearSemester || "").slice(0, 40) || null : null,
    data.role === "staff" ? sanitizeText(data.employeeId || "").slice(0, 40) || null : null,
    data.role === "staff" ? sanitizeText(data.designation || "").slice(0, 120) || null : null,
    autoVerify ? 1 : 0,
    status,
    nowIso(),
    nowIso(),
  );

  logAudit({
    action: data.role === "staff" ? "Staff registration submitted" : "Student registration",
    entityType: "user",
    entityId: id,
    details: data.email,
    ip,
  });

  let verifyUrl = "";
  let devCode = "";
  if (!autoVerify) {
    const result = await sendVerificationEmail(data.email, data.fullName);
    if (!emailDeliveryConfigured()) {
      verifyUrl = result.url;
      devCode = result.code;
    }
  }

  return NextResponse.json({
    ok: true,
    requiresVerification: !autoVerify,
    pendingApproval: data.role === "staff",
    verificationUrl: verifyUrl,
    devCode,
    message: autoVerify
      ? data.role === "staff"
        ? "Account created. Staff access requires administrator approval before sign-in."
        : "Account created. You can now sign in."
      : "Account created. We sent a 6-digit verification code to your email.",
  });
}
