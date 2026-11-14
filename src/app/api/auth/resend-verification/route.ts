import { NextResponse, type NextRequest } from "next/server";
import { one } from "@/lib/db";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { forgotSchema } from "@/lib/validation";
import { createSupabaseClient } from "@/lib/supabase";
import { appBaseUrlForRequest } from "@/lib/email";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (!(await rateLimit(`resend:${clientIp(req)}`, 6, 60 * 60 * 1000)).allowed) {
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

  let supabase;
  try {
    supabase = await createSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase Auth is not configured." },
      { status: 503 },
    );
  }

  const profile = await one<{ email_verified: number; status: string; is_demo: number }>(
    "SELECT email_verified, status, is_demo FROM users WHERE lower(email) = ?",
    parsed.data.email,
  );
  if (
    !profile ||
    profile.is_demo === 1 ||
    profile.email_verified ||
    ["suspended", "deleted"].includes(profile.status)
  ) {
    return NextResponse.json({
      ok: true,
      message: "If a matching unverified account exists, a new verification code has been sent.",
    });
  }
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${appBaseUrlForRequest(req.nextUrl)}/api/auth/google/callback?next=/login` },
  });
  if (error) {
    return NextResponse.json({ error: error.message || "Supabase could not resend the verification code." }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    message: "If a matching unverified account exists, a new verification code has been sent.",
  });
}
