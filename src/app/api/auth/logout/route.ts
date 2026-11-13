import { NextResponse, type NextRequest } from "next/server";
import { destroySession, getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clientIp } from "@/lib/http";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  await destroySession();
  if (user) {
    logAudit({
      actor: user,
      action: "User signed out",
      entityType: "user",
      entityId: user.id,
      ip: clientIp(req),
    });
  }
  return NextResponse.json({ ok: true, redirect: "/" });
}
