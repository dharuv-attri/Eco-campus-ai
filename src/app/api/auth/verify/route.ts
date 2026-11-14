import { NextResponse, type NextRequest } from "next/server";
import { one, run } from "@/lib/db";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { nowIso } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { createSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (!(await rateLimit(`verify:${clientIp(req)}`, 15, 60 * 60 * 1000)).allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  let json: { token?: string };
  try {
    json = (await req.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!json.token || typeof json.token !== "string" || json.token.length > 200) {
    return NextResponse.json({ error: "Verification token is missing." }, { status: 400 });
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
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: json.token,
    type: "signup",
  });
  if (error || !data.user?.email) {
    return NextResponse.json(
      { error: error?.message || "This verification link is invalid or has expired." },
      { status: 400 },
    );
  }

  const profile = await one<{ id: string; email: string; status: string }>(
    "SELECT id, email, status FROM users WHERE lower(email) = ?",
    data.user.email.toLowerCase(),
  );
  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json({ error: "Your account has no EcoCampus profile. Contact an administrator." }, { status: 403 });
  }
  await run("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?", nowIso(), profile.id);
  const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
  if (signOutError) {
    console.error("Email verified but Supabase sign-out failed:", signOutError.message);
    return NextResponse.json({ error: "Email verified, but sign-out failed. Please sign out before continuing." }, { status: 502 });
  }
  await logAudit({
    action: "Email verified",
    entityType: "user",
    entityId: profile.id,
    details: profile.email,
    ip: clientIp(req),
  });
  return NextResponse.json({
    ok: true,
    message:
      profile.status === "pending"
        ? "Email verified. Your staff account is now awaiting administrator approval."
        : "Email verified. You can now sign in.",
  });
}
