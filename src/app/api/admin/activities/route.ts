import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { greenActivitySchema } from "@/lib/validation";
import { all, run } from "@/lib/db";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { nowIso, sanitizeText } from "@/lib/utils";
import { revalidatePublicContent } from "@/lib/revalidate";

export async function GET() {
  const auth = await authorizeApi(["admin", "super_admin"]);
  if (auth.response) return auth.response;
  return NextResponse.json({
    ok: true,
    activities: await all(
      `SELECT ga.*,
        (SELECT COUNT(*) FROM leaderboard_points lp WHERE lp.activity_id = ga.id) AS awarded
       FROM green_activities ga ORDER BY ga.created_at DESC`,
    ),
  });
}

export async function POST(req: NextRequest) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi(["admin", "super_admin"]);
  if (auth.response) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = greenActivitySchema.safeParse(json);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Check the activity details.");
  const input = parsed.data;

  const id = randomUUID();
  await run(
    `INSERT INTO green_activities (id, title, description, points, activity_date, verified, is_demo, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)`,
    id,
    sanitizeText(input.title),
    sanitizeText(input.description) || null,
    input.points,
    sanitizeText(input.activityDate) || null,
    auth.user.id,
    nowIso(),
  );

  let awarded = 0;
  for (const userId of input.userIds) {
    const student = (await all<{ id: string }>(
      "SELECT id FROM users WHERE id = ? AND role = 'student' AND status = 'active'",
      userId,
    ))[0];
    if (!student) continue;
    await run(
      `INSERT INTO leaderboard_points (id, user_id, points, reason, activity_id, is_demo, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      randomUUID(),
      student.id,
      input.points,
      `Verified green activity: ${sanitizeText(input.title)}`,
      id,
      nowIso(),
    );
    await notifyUser({
      userId: student.id,
      type: "points",
      title: "Green activity verified",
      message: `You earned ${input.points} points for ${sanitizeText(input.title)}.`,
    });
    awarded += 1;
  }

  await logAudit({
    actor: auth.user,
    action: "Created a verified green activity",
    entityType: "activity",
    entityId: id,
    details: `${sanitizeText(input.title)} · ${awarded} students · ${input.points} points`,
    ip: clientIp(req),
  });

  revalidatePublicContent();
  return NextResponse.json({ ok: true, id, awarded }, { status: 201 });
}

const deleteSchema = z.object({ id: z.string().min(1).max(80) });

export async function DELETE(req: NextRequest) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi(["admin", "super_admin"]);
  if (auth.response) return auth.response;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) return apiError("Activity ID is required.");
  await run("DELETE FROM leaderboard_points WHERE activity_id = ?", parsed.data.id);
  await run("DELETE FROM green_activities WHERE id = ?", parsed.data.id);
  await logAudit({
    actor: auth.user,
    action: "Deleted a green activity",
    entityType: "activity",
    entityId: parsed.data.id,
    ip: clientIp(req),
  });
  revalidatePublicContent();
  return NextResponse.json({ ok: true });
}
