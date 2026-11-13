import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { all, one, run } from "@/lib/db";
import { authorizeApi, enforceSameOrigin, apiError } from "@/lib/http";
import { nowIso } from "@/lib/utils";

export async function GET() {
  const auth = await authorizeApi();
  if (auth.response) return auth.response;
  const notifications = all(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 60`,
    auth.user.id,
  );
  const unread = one<{ count: number }>(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0",
    auth.user.id,
  );
  return NextResponse.json({ ok: true, notifications, unread: unread?.count ?? 0 });
}

const schema = z.object({
  action: z.enum(["read", "read_all"]),
  id: z.string().max(80).optional(),
});

export async function POST(req: NextRequest) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi();
  if (auth.response) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return apiError("Invalid notification action.");

  if (parsed.data.action === "read_all") {
    run(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
      auth.user.id,
    );
  } else {
    if (!parsed.data.id) return apiError("Notification ID is required.");
    run(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      parsed.data.id,
      auth.user.id,
    );
  }
  return NextResponse.json({ ok: true, at: nowIso() });
}
