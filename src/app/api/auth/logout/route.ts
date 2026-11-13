import { NextResponse, type NextRequest } from "next/server";
import { destroySession, getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clientIp, sameOrigin } from "@/lib/http";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    const user = await getSessionUser();
    const { error } = await destroySession();
    if (error) {
      console.error("Supabase sign-out failed:", error.message);
      return NextResponse.json({ error: "Sign-out failed. Please try again." }, { status: 502 });
    }
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
  } catch (error) {
    console.error(
      "Supabase sign-out could not be completed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
