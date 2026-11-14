import { NextResponse, type NextRequest } from "next/server";
import { one } from "@/lib/db";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { recoveryVerifySchema } from "@/lib/validation";
import { createSupabaseAuthClient } from "@/lib/supabase";
import { RECOVERY_COOKIE, recoveryCookieOptions, sealRecoverySession } from "@/lib/recovery";

function friendlyError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("expired")) {
    return "That code has expired. Request a new password reset code.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many verification attempts. Please wait a few minutes and try again.";
  }
  if (
    lower.includes("invalid") ||
    lower.includes("token") ||
    lower.includes("otp") ||
    lower.includes("not found")
  ) {
    return "That code is not correct. Check the latest email and try again.";
  }
  return message || "We could not verify that code. Request a new one.";
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const ip = clientIp(req);
  if (!(await rateLimit(`recovery-verify:${ip}`, 15, 15 * 60 * 1000)).allowed) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please wait 15 minutes." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = recoveryVerifySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Enter the code from your email." },
      { status: 400 },
    );
  }
  const { email, code } = parsed.data;

  if (!(await rateLimit(`recovery-verify-email:${email}`, 10, 15 * 60 * 1000)).allowed) {
    return NextResponse.json(
      { error: "Too many attempts for this email. Request a new code later." },
      { status: 429 },
    );
  }

  const supabase = createSupabaseAuthClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "recovery",
  });
  if (error || !data.session || !data.user?.email) {
    return NextResponse.json({ error: friendlyError(error?.message ?? "") }, { status: 400 });
  }

  const profile = await one<{ id: string; email: string; status: string; is_demo: number }>(
    "SELECT id, email, status, is_demo FROM users WHERE lower(email) = ?",
    data.user.email.trim().toLowerCase(),
  );
  if (!profile || profile.is_demo === 1 || ["suspended", "deleted"].includes(profile.status)) {
    // Revoke the temporary recovery session: this account must not be able to
    // set a password through the public recovery flow.
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return NextResponse.json(
      {
        error:
          "This email is not attached to an active EcoCampus account. Contact a platform administrator.",
      },
      { status: 403 },
    );
  }

  let sealed: string;
  try {
    sealed = sealRecoverySession({
      email: data.user.email,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (sealError) {
    console.error("Could not seal the recovery session:", sealError);
    return NextResponse.json(
      { error: "Password reset is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    verified: true,
    message: "Code verified. Choose a new password.",
    email: data.user.email,
  });
  response.cookies.set(RECOVERY_COOKIE, sealed, recoveryCookieOptions());
  return response;
}
