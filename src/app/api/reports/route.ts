import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { complaintSchema } from "@/lib/validation";
import { authorizeApi, clientIp, enforceSameOrigin, apiError, rateLimit } from "@/lib/http";
import { all, run } from "@/lib/db";
import { complaintCode, duplicateCandidates, recordHistory } from "@/lib/complaints";
import { notifyAdmins, notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { categoryLabel } from "@/lib/utils";
import { nowIso, sanitizeText } from "@/lib/utils";

export const runtime = "nodejs";

const IMAGE_URL = /^\/uploads\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i;

export async function POST(req: NextRequest) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi();
  if (auth.response) return auth.response;
  const user = auth.user;

  if (!rateLimit(`report:${user.id}:${clientIp(req)}`, 12, 60 * 60 * 1000).allowed) {
    return apiError("You have submitted several reports recently. Please try again later.", 429);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = complaintSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Check the report details.");
  }
  const input = parsed.data;

  const imageUrls = input.imageUrls.filter((url) => IMAGE_URL.test(url));
  if (imageUrls.length !== input.imageUrls.length) {
    return apiError("One or more image references are invalid.");
  }
  if (imageUrls.length) {
    const placeholders = imageUrls.map(() => "?").join(",");
    const storedNames = imageUrls.map((url) => url.replace("/uploads/", ""));
    const owned = all<{ stored_name: string }>(
      `SELECT stored_name FROM uploaded_files WHERE owner_id = ? AND stored_name IN (${placeholders})`,
      user.id,
      ...storedNames,
    );
    if (owned.length !== storedNames.length) {
      return apiError("One or more images do not belong to your account.");
    }
  }

  if (!input.confirmedDuplicate) {
    const candidates = duplicateCandidates({
      userId: user.id,
      category: input.category,
      locationId: input.locationId || null,
      building: input.building || null,
      title: input.title,
    });
    if (candidates.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "A similar recent report already exists.",
          duplicates: candidates.map((candidate) => ({
            id: candidate.id,
            complaint_code: candidate.complaint_code,
            title: candidate.title,
            status: candidate.status,
            created_at: candidate.created_at,
          })),
        },
        { status: 409 },
      );
    }
  }

  const settings = getSettings();
  const anonymous =
    input.anonymous && settings.anonymous_reporting_enabled !== "false" ? 1 : 0;
  const id = randomUUID();
  const code = complaintCode();
  const now = nowIso();
  const category = categoryLabel(input.category);

  run(
    `INSERT INTO complaints (
       id, complaint_code, reporter_id, anonymous, title, category, description, priority, status,
       location_id, building, floor, room_number, specific_location, lat, lng,
       is_demo, points_awarded, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
    id,
    code,
    user.id,
    anonymous,
    sanitizeText(input.title),
    input.category,
    sanitizeText(input.description),
    input.priority,
    input.locationId || null,
    sanitizeText(input.building) || null,
    sanitizeText(input.floor) || null,
    sanitizeText(input.roomNumber) || null,
    sanitizeText(input.specificLocation) || null,
    input.lat ?? null,
    input.lng ?? null,
    now,
    now,
  );

  for (const url of imageUrls) {
    run(
      `INSERT INTO complaint_images (id, complaint_id, url, kind, uploaded_by, created_at)
       VALUES (?, ?, ?, 'report', ?, ?)`,
      randomUUID(),
      id,
      url,
      user.id,
      now,
    );
  }

  recordHistory({
    complaintId: id,
    fromStatus: null,
    toStatus: "submitted",
    note: "Report submitted through EcoCampus AI.",
    changedBy: user.id,
  });

  notifyUser({
    userId: user.id,
    complaintId: id,
    type: "status",
    title: "Report received",
    message: `${code} has been submitted. We will notify you when it is reviewed.`,
  });
  notifyAdmins({
    complaintId: id,
    type: "new_report",
    title: "New environmental report",
    message: `${code} · ${category} · ${sanitizeText(input.title).slice(0, 100)}`,
  });
  logAudit({
    actor: user,
    action: "Submitted an environmental report",
    entityType: "complaint",
    entityId: id,
    details: `${code} · ${input.category} · ${input.priority}${anonymous ? " · anonymous" : ""}`,
    ip: clientIp(req),
  });

  return NextResponse.json(
    {
      ok: true,
      complaint: { id, complaint_code: code, is_demo: 0 },
      message: "Report submitted successfully.",
    },
    { status: 201 },
  );
}
