import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { one } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  const unread = one<{ count: number }>(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0",
    user.id,
  );
  return NextResponse.json({ user, unread: unread?.count ?? 0 });
}
