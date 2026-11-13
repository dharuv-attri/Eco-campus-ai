import { NextResponse, type NextRequest } from "next/server";
import { resetSchema } from "@/lib/validation";
import { run } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { consumeEmailToken } from "@/lib/email";
import { nowIso } from "@/lib/utils";

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
  const userId = consumeEmailToken(parsed.data.token, "reset");
  if (!userId) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }
  const hash = await hashPassword(parsed.data.password);
  run("UPDATE users SET password_hash = ?, failed_attempts = 0, updated_at = ? WHERE id = ?", hash, nowIso(), userId);
  run("DELETE FROM sessions WHERE user_id = ?", userId);
  return NextResponse.json({ ok: true, message: "Password updated. You can now sign in." });
}
