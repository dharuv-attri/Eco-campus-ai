import { NextResponse, type NextRequest } from "next/server";
import { run, one } from "@/lib/db";
import { clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { consumeEmailToken } from "@/lib/email";
import { nowIso } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (!rateLimit(`verify:${clientIp(req)}`, 15, 60 * 60 * 1000).allowed) {
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
  const userId = consumeEmailToken(json.token, "verify");
  if (!userId) {
    return NextResponse.json({ error: "This verification link is invalid or has expired." }, { status: 400 });
  }
  run("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?", nowIso(), userId);
  const user = one<{ email: string; role: string; status: string }>(
    "SELECT email, role, status FROM users WHERE id = ?",
    userId,
  );
  logAudit({
    action: "Email verified",
    entityType: "user",
    entityId: userId,
    details: user?.email,
    ip: clientIp(req),
  });
  return NextResponse.json({
    ok: true,
    message:
      user?.status === "pending"
        ? "Email verified. Your staff account is now awaiting administrator approval."
        : "Email verified. You can now sign in.",
  });
}
