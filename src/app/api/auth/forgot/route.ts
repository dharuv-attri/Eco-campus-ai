import { NextResponse, type NextRequest } from "next/server";
import { forgotSchema } from "@/lib/validation";
import { one } from "@/lib/db";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { emailDeliveryConfigured, sendResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const ip = clientIp(req);
  if (!rateLimit(`forgot:${ip}`, 6, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
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
  const user = one<{ id: string; email: string; full_name: string; status: string }>(
    "SELECT id, email, full_name, status FROM users WHERE email = ?",
    parsed.data.email,
  );

  let resetLink = "";
  if (user && user.status !== "suspended") {
    const result = await sendResetEmail(user.email, user.full_name);
    if (!emailDeliveryConfigured()) resetLink = result.url;
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, a password reset link has been created. For privacy, the response is the same either way.",
    resetUrl: resetLink,
  });
}
