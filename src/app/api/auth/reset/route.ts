import { NextResponse, type NextRequest } from "next/server";
import { resetSchema } from "@/lib/validation";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { createSupabaseAuthClient, createSupabaseClient } from "@/lib/supabase";
import { RECOVERY_COOKIE, openRecoverySession, recoveryCookieOptions } from "@/lib/recovery";

function clearRecoveryCookie(response: NextResponse) {
  response.cookies.set(RECOVERY_COOKIE, "", { ...recoveryCookieOptions(), maxAge: 0 });
  return response;
}

function passwordError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("different from the old")) {
    return "Choose a password that is different from your current password.";
  }
  if (lower.includes("weak") || lower.includes("at least")) {
    return "That password is too weak. Use at least 8 characters with upper and lower case letters and a number.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  return message || "Supabase could not update your password.";
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const ip = clientIp(req);
  if (!(await rateLimit(`reset:${ip}`, 12, 60 * 60 * 1000)).allowed) {
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid password." },
      { status: 400 },
    );
  }

  const sealed = req.cookies.get(RECOVERY_COOKIE)?.value;
  const pending = openRecoverySession(sealed);

  if (sealed && !pending) {
    return clearRecoveryCookie(
      NextResponse.json(
        { error: "Your verification has expired. Request a new password reset code." },
        { status: 401 },
      ),
    );
  }

  if (pending) {
    const supabase = createSupabaseAuthClient();
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: pending.accessToken,
      refresh_token: pending.refreshToken,
    });
    if (sessionError) {
      return clearRecoveryCookie(
        NextResponse.json(
          { error: "Your verification has expired. Request a new password reset code." },
          { status: 401 },
        ),
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (updateError) {
      return NextResponse.json({ error: passwordError(updateError.message) }, { status: 400 });
    }
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

    return clearRecoveryCookie(
      NextResponse.json({ ok: true, message: "Password updated. You can now sign in." }),
    );
  }

  // Legacy support: users who clicked an older reset link arrive here with a
  // normal Supabase session established by the OAuth callback.
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
      { error: "Your password reset session is missing or expired. Request a new reset code." },
      { status: 401 },
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (updateError) {
    return NextResponse.json({ error: passwordError(updateError.message) }, { status: 400 });
  }
  const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
  if (signOutError) {
    console.error("Password updated but Supabase sign-out failed:", signOutError.message);
  }

  return NextResponse.json({ ok: true, message: "Password updated. You can now sign in." });
}
