import { NextResponse, type NextRequest } from "next/server";
import { one } from "@/lib/db";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { emailDeliveryConfigured, sendOtpEmail } from "@/lib/email";
import { otpRequestSchema } from "@/lib/validation";

/**
 * Passwordless entry point. Emails a 6-digit one-time code plus a magic link
 * for either signing in ("login") or verifying an email address ("verify").
 * Always answers positively for unknown addresses to avoid account enumeration.
 * In demo mode (no email delivery configured) the code is returned so the
 * local workspace stays usable; with delivery configured nothing is exposed.
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const ip = clientIp(req);
  if (!rateLimit(`otp-request:${ip}`, 8, 15 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many code requests. Please wait 15 minutes." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = otpRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check your details." }, { status: 400 });
  }
  const { email, purpose } = parsed.data;
  if (!rateLimit(`otp-email:${email}`, 4, 10 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many codes requested for this account. Please wait." }, { status: 429 });
  }

  const user = one<{ id: string; email: string; full_name: string; email_verified: number; status: string }>(
    "SELECT id, email, full_name, email_verified, status FROM users WHERE email = ?",
    email,
  );

  let message = "If that email is registered, a 6-digit code is on its way. It expires in 10 minutes.";
  let devCode: string | undefined;
  let devUrl: string | undefined;

  if (user && user.status !== "suspended") {
    if (purpose === "login") {
      if (user.status === "pending") {
        return NextResponse.json(
          { ok: true, message: "This staff account is awaiting administrator approval, so a sign-in code cannot be issued yet." },
        );
      }
      if (!user.email_verified) {
        return NextResponse.json({
          ok: true,
          message: "This email is not verified yet. Switch to email verification to confirm it, then sign in.",
          needsVerification: true,
        });
      }
    }
    if (purpose === "verify" && user.email_verified === 1) {
      return NextResponse.json({ ok: true, message: "This email is already verified. You can sign in directly." });
    }

    const result = await sendOtpEmail(user.email, purpose);
    if (!result) {
      return NextResponse.json({ ok: true, message });
    }
    if (!emailDeliveryConfigured()) {
      // Demo mode: email delivery is not configured, surface the code locally.
      devCode = result.code;
      devUrl = result.url;
      message =
        purpose === "login"
          ? "Demo mode: no email delivery configured, so the sign-in code is shown below."
          : "Demo mode: no email delivery configured, so the verification code is shown below.";
    }
  }

  return NextResponse.json({ ok: true, message, devCode, devUrl });
}
