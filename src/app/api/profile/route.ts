import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { profileSchema } from "@/lib/validation";
import { run } from "@/lib/db";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { nowIso, sanitizeText } from "@/lib/utils";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi();
  if (auth.response) return auth.response;
  const user = auth.user;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = profileSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Check your profile details.");
  }
  const input = parsed.data;
  const image = input.profileImage || "";
  if (image && !/^\/uploads\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i.test(image)) {
    return apiError("Profile image reference is invalid.");
  }

  await run(
    `UPDATE users SET
       full_name = ?, student_id = ?, course = ?, department = ?, year_semester = ?,
       employee_id = ?, designation = ?, profile_image = ?, updated_at = ?
     WHERE id = ?`,
    sanitizeText(input.fullName),
    sanitizeText(input.studentId) || null,
    sanitizeText(input.course) || null,
    sanitizeText(input.department) || null,
    sanitizeText(input.yearSemester) || null,
    sanitizeText(input.employeeId) || null,
    sanitizeText(input.designation) || null,
    image || null,
    nowIso(),
    user.id,
  );

  await logAudit({
    actor: user,
    action: "Updated own profile",
    entityType: "user",
    entityId: user.id,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
}
