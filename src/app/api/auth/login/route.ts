import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation";
import { one, run } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { ROLE_HOME } from "@/lib/constants";
import { nowIso } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7Uk7h5F5J0mXQ0jM5qZQ0jM5qZQ0jM5";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const ip = clientIp(req);
  if (!rateLimit(`login:${ip}`, 20, 15 * 60 * 1000).allowed) {
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
  const { email, password } = parsed.data;
  if (!rateLimit(`login-email:${email}`, 8, 15 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many attempts for this account. Please wait." }, { status: 429 });
  }

  const user = one<{
    id: string;
    email: string;
    full_name: string;
    password_hash: string | null;
    role: string;
    status: string;
    email_verified: number;
    locked_until: string | null;
    failed_attempts: number;
  }>(
    "SELECT id, email, full_name, password_hash, role, status, email_verified, locked_until, failed_attempts FROM users WHERE email = ?",
    email,
  );

  const passwordOk = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    if (user) {
      run(
        "UPDATE users SET failed_attempts = failed_attempts + 1, updated_at = ? WHERE id = ?",
        nowIso(),
        user.id,
      );
    }
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (user.status === "suspended") {
    return NextResponse.json(
      { error: "This account is suspended. Contact a platform administrator." },
      { status: 403 },
    );
  }
  if (user.status === "pending") {
    return NextResponse.json(
      {
        error:
          "Your staff account is awaiting administrator approval. You will be able to sign in once approved.",
      },
      { status: 403 },
    );
  }
  if (!user.email_verified) {
    return NextResponse.json(
      { error: "Please verify your email before signing in. Open the verification page and enter the 6-digit code we emailed you, or request a new one.", needsVerification: true },
      { status: 403 },
    );
  }

  run(
    "UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
    nowIso(),
    user.id,
  );
  await createSession(user.id, {
    ip,
    userAgent: req.headers.get("user-agent") || undefined,
  });
  logAudit({
    action: "User signed in",
    entityType: "user",
    entityId: user.id,
    details: `${user.role} · ${email}`,
    ip,
  });

  return NextResponse.json({
    ok: true,
    role: user.role,
    redirect: ROLE_HOME[user.role] ?? "/",
    name: user.full_name,
  });
}
