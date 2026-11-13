import { NextResponse, type NextRequest } from "next/server";
import { one } from "@/lib/db";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { emailDeliveryConfigured, sendOtpEmail } from "@/lib/email";
import { forgotSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (!rateLimit(`resend:${clientIp(req)}`, 6, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = forgotSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  const user = one<{ id: string; email: string; full_name: string; email_verified: number; status: string }>(
    "SELECT id, email, full_name, email_verified, status FROM users WHERE email = ?",
    parsed.data.email,
  );

  let verificationUrl = "";
  let devCode = "";
  if (user && user.email_verified === 0 && user.status !== "suspended") {
    const result = await sendOtpEmail(user.email, "verify");
    if (result) {
      if (!emailDeliveryConfigured()) {
        verificationUrl = result.url;
        devCode = result.code;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If a matching unverified account exists, a new verification code has been sent. Check your inbox.",
    verificationUrl,
    devCode,
  });
}
