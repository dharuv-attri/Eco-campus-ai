import { NextResponse, type NextRequest } from "next/server";
import { one, run } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { consumeOtp } from "@/lib/email";
import { ROLE_HOME } from "@/lib/constants";
import { nowIso } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { otpVerifySchema } from "@/lib/validation";

/** Verify a 6-digit one-time code: either completes email verification or signs the user in. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const ip = clientIp(req);
  if (!rateLimit(`otp-verify:${ip}`, 15, 15 * 60 * 1000).allowed) {
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
  const { email, code, purpose } = parsed.data;

  const user = one<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    status: string;
    email_verified: number;
  }>(
    "SELECT id, email, full_name, role, status, email_verified FROM users WHERE email = ?",
    email,
  );
  if (!user) return NextResponse.json({ error: "That code is not valid. Request a new one." }, { status: 400 });

  const otpType = purpose === "login" ? ("otp_login" as const) : ("otp_verify" as const);
  if (!consumeOtp(user.id, code, otpType)) {
    return NextResponse.json(
      { error: "That code is incorrect or has expired. Codes last 10 minutes - request a new one." },
      { status: 400 },
    );
  }

  if (purpose === "verify") {
    run("UPDATE users SET email_verified = 1, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?", nowIso(), user.id);
    logAudit({
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

  if (user.status === "suspended") {
    return NextResponse.json({ error: "This account is suspended. Contact a platform administrator." }, { status: 403 });
  }
  if (user.status === "pending") {
    return NextResponse.json(
      { error: "Your staff account is awaiting administrator approval. You will be able to sign in once approved." },
      { status: 403 },
    );
  }

  run("UPDATE users SET email_verified = 1, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?", nowIso(), user.id);
  await createSession(user.id, {
    ip,
    userAgent: req.headers.get("user-agent") || undefined,
  });
  logAudit({
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
