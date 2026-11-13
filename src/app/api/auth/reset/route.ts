import { NextResponse, type NextRequest } from "next/server";
import { resetSchema } from "@/lib/validation";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { createSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (!rateLimit(`reset:${clientIp(req)}`, 10, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = resetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid password." }, { status: 400 });
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

  const { data: userData, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !userData.user) {
    return NextResponse.json(
      { error: "Your password reset session is missing or expired. Request a new reset email." },
      { status: 401 },
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (updateError) {
    return NextResponse.json({ error: updateError.message || "Supabase could not update your password." }, { status: 400 });
  }
  const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
  if (signOutError) {
    console.error("Password updated but Supabase sign-out failed:", signOutError.message);
    return NextResponse.json(
      { error: "Password updated, but this session could not be closed. Sign out manually and sign in again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, message: "Password updated. You can now sign in." });
}
