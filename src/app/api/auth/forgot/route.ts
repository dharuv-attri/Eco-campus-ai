import { NextResponse, type NextRequest } from "next/server";
import { forgotSchema } from "@/lib/validation";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { createSupabaseClient } from "@/lib/supabase";
import { appBaseUrlForRequest } from "@/lib/email";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (!rateLimit(`forgot:${clientIp(req)}`, 6, 60 * 60 * 1000).allowed) {
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

  let supabase;
  try {
    supabase = await createSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase Auth is not configured." },
      { status: 503 },
    );
  }

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appBaseUrlForRequest(req.nextUrl)}/api/auth/google/callback?next=/reset-password`,
  });
  if (error) {
    return NextResponse.json({ error: error.message || "Supabase could not send a password reset email." }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a password reset email has been sent.",
  });
}
