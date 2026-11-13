import { NextResponse, type NextRequest } from "next/server";
import { one } from "@/lib/db";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { otpRequestSchema } from "@/lib/validation";
import { createSupabaseClient } from "@/lib/supabase";
import { appBaseUrlForRequest } from "@/lib/email";

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

  let supabase;
  try {
    supabase = await createSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase Auth is not configured." },
      { status: 503 },
    );
  }

  const user = one<{ email: string; email_verified: number; status: string; is_demo: number }>(
    "SELECT email, email_verified, status, is_demo FROM users WHERE lower(email) = ?",
    email,
  );
  const genericMessage = "If the account is eligible, a code has been sent to its email address.";
  if (!user || user.is_demo === 1 || user.status === "suspended" || user.status === "deleted") {
    return NextResponse.json({ ok: true, message: genericMessage });
  }
  if (purpose === "verify" && user.email_verified === 1) {
    return NextResponse.json({ ok: true, message: "This email is already verified. You can sign in." });
  }
  if (purpose === "login" && user.status === "pending") {
    return NextResponse.json({
      ok: true,
      message: "Your staff account is awaiting administrator approval, so a sign-in code cannot be issued yet.",
    });
  }
  const needsVerification = purpose === "login" && user.email_verified !== 1;

  const result =
    purpose === "verify" || needsVerification
      ? await supabase.auth.resend({
          type: "signup",
          email: user.email,
          options: { emailRedirectTo: `${appBaseUrlForRequest(req.nextUrl)}/api/auth/google/callback?next=/login` },
        })
      : await supabase.auth.signInWithOtp({
          email: user.email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${appBaseUrlForRequest(req.nextUrl)}/api/auth/google/callback`,
          },
        });

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message || "Supabase could not send the email code." },
      { status: 502 },
    );
  }
  return NextResponse.json({
    ok: true,
    message: needsVerification
      ? "Your email is not verified yet. A verification code has been sent."
      : purpose === "verify"
        ? "A new verification code has been sent. Check your inbox."
        : "A sign-in code has been sent. Check your inbox.",
    needsVerification,
  });
}
