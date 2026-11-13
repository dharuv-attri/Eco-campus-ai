import { NextResponse, type NextRequest } from "next/server";
import { one, run } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { clientIp } from "@/lib/http";
import { consumeEmailToken } from "@/lib/email";
import { ROLE_HOME } from "@/lib/constants";
import { nowIso } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

/** One-click passwordless sign-in via the magic link from the code email. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  if (!token || token.length > 200) {
    return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("That sign-in link is invalid. Request a new code."), req.url));
  }

  const userId = consumeEmailToken(token, "magic");
  if (!userId) {
    return NextResponse.redirect(
      new URL("/login?error=" + encodeURIComponent("That sign-in link has expired or was already used. Request a new code."), req.url),
    );
  }

  const user = one<{ id: string; email: string; full_name: string; role: string; status: string }>(
    "SELECT id, email, full_name, role, status FROM users WHERE id = ?",
    userId,
  );
  if (!user || user.status === "suspended" || user.status === "pending") {
    const reason =
      !user || user.status === "suspended"
        ? "This account cannot be signed in to. Contact a platform administrator."
        : "Your staff account is awaiting administrator approval.";
    return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent(reason), req.url));
  }

  const ip = clientIp(req);
  run("UPDATE users SET email_verified = 1, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?", nowIso(), user.id);
  await createSession(user.id, {
    ip,
    userAgent: req.headers.get("user-agent") || undefined,
  });
  logAudit({
    action: "User signed in (magic link)",
    entityType: "user",
    entityId: user.id,
    details: `${user.role} · ${user.email}`,
    ip,
  });
  return NextResponse.redirect(new URL(ROLE_HOME[user.role] ?? "/", req.url));
}
