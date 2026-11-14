import { NextResponse, type NextRequest } from "next/server";
import { forgotSchema } from "@/lib/validation";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { createSupabaseAuthClient } from "@/lib/supabase";
import { appBaseUrlForRequest } from "@/lib/email";

const GENERIC_MESSAGE =
  "If an account exists for that email, we have sent a 6-digit password reset code. Check your inbox and spam folder.";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const ip = clientIp(req);
  if (!(await rateLimit(`forgot:${ip}`, 8, 60 * 60 * 1000)).allowed) {
    return NextResponse.json(
      { error: "Too many reset requests. Please wait a little while and try again." },
      { status: 429 },
    );
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = forgotSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const email = parsed.data.email;
  if (!(await rateLimit(`forgot-email:${email}`, 3, 10 * 60 * 1000)).allowed) {
    return NextResponse.json(
      { error: "A reset code was requested recently for this email. Please wait a few minutes before resending." },
      { status: 429 },
    );
  }

  let redirectTo: string;
  try {
    redirectTo = new URL("/reset-password", appBaseUrlForRequest(req.nextUrl)).toString();
  } catch (error) {
    console.error("Could not resolve the password recovery redirect:", error);
    return NextResponse.json(
      { error: "Password reset is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }

  // Supabase sends the recovery OTP from its configured Recovery template.
  // Keep the redirect on the reset page rather than entering the sign-in callback.
  const supabase = createSupabaseAuthClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    const message = error.message || "";
    if (error.status === 429 || /rate limit|too many/i.test(message)) {
      return NextResponse.json(
        { error: "The email service is rate limiting requests. Please wait a few minutes and try again." },
        { status: 429 },
      );
    }
    // Do not reveal whether the address exists. Only genuine delivery failures
    // are surfaced, and even those use a neutral message.
    console.error("Password recovery email failed:", message);
    return NextResponse.json(
      { error: "We could not send the reset email right now. Please try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
