import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { staffUpdateSchema } from "@/lib/validation";
import { all, run } from "@/lib/db";
import { canManageComplaint } from "@/lib/auth";
import { getComplaint, transitionComplaint } from "@/lib/complaints";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { notifyAdmins } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { nowIso, sanitizeText } from "@/lib/utils";

const IMAGE_URL = /^\/uploads\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi(["staff"]);
  if (auth.response) return auth.response;
  const user = auth.user;
  const { id } = await params;

  const complaint = await getComplaint(id);
  if (!complaint) return apiError("Report not found.", 404);
  if (!canManageComplaint(user, complaint)) {
    return apiError("This report is not assigned to you or your department.", 403);
  }
  if (complaint.status === "archived") {
    return apiError("This report is archived. Ask an administrator to restore it before making updates.", 409);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = staffUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Check the update details.");
  }
  const input = parsed.data;
  const message = sanitizeText(input.message);
  const resolutionNotes = sanitizeText(input.resolutionNotes);
  const imageUrls = input.imageUrls.filter((url) => IMAGE_URL.test(url));
  if (imageUrls.length !== input.imageUrls.length) return apiError("Invalid image reference.");

  if (imageUrls.length) {
    const placeholders = imageUrls.map(() => "?").join(",");
    const storedNames = imageUrls.map((url) => url.replace("/uploads/", ""));
    const owned = await all<{ stored_name: string }>(
      `SELECT stored_name FROM uploaded_files WHERE owner_id = ? AND stored_name IN (${placeholders})`,
      user.id,
      ...storedNames,
    );
    if (owned.length !== storedNames.length) return apiError("One or more images do not belong to you.");
  }

  const openStatuses = ["assigned", "in_progress", "reopened"];
  if (["start", "progress", "resolve"].includes(input.action) && !openStatuses.includes(complaint.status)) {
    return apiError("This report cannot be updated in its current status.", 400);
  }
  if (input.action === "resolve" && resolutionNotes.length < 10) {
    return apiError("Add resolution notes describing the work completed.");
  }
  if (["progress", "request_info", "note"].includes(input.action) && message.length < 3) {
    return apiError("Add a short message for this update.");
  }
  if (input.action === "archive" && message.length < 10) {
    return apiError("Add a reason for archiving this report (at least 10 characters).");
  }

  let updateType = "progress";
  if (input.action === "resolve") updateType = "resolution";
  if (input.action === "note" || input.action === "request_info") updateType = "note";

  if (input.action !== "archive") {
    await run(
      `INSERT INTO staff_updates (id, complaint_id, staff_id, update_type, message, image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      id,
      user.id,
      updateType,
      message || (input.action === "start" ? "Work started on site." : resolutionNotes),
      imageUrls[0] ?? null,
      nowIso(),
    );
  }

  if (input.action === "archive") {
    await transitionComplaint({
      complaint,
      toStatus: "archived",
      actor: user,
      note: message,
      notify: {
        title: "Report archived",
        message: `${complaint.complaint_code} was archived by the assigned team. Its history remains available.`,
      },
    });
  } else if (input.action === "start" || input.action === "progress") {
    await transitionComplaint({
      complaint,
      toStatus: "in_progress",
      actor: user,
      note: message || "Work is now in progress.",
      notify: {
        title: "Work started on your report",
        message: `${complaint.complaint_code} is now in progress. ${message.slice(0, 240)}`.trim(),
        type: "status",
      },
    });
  } else if (input.action === "resolve") {
    for (const url of imageUrls) {
      await run(
        `INSERT INTO complaint_images (id, complaint_id, url, kind, uploaded_by, created_at)
         VALUES (?, ?, ?, 'resolution', ?, ?)`,
        randomUUID(),
        id,
        url,
        user.id,
        nowIso(),
      );
    }
    await transitionComplaint({
      complaint,
      toStatus: "resolved",
      actor: user,
      note: resolutionNotes,
      fields: {
        resolution_notes: resolutionNotes,
        resolved_at: nowIso(),
      },
      notify: {
        title: "Your report has been resolved",
        message: `${complaint.complaint_code} has been marked resolved. ${resolutionNotes.slice(0, 240)}`.trim(),
        type: "status",
      },
    });
    await notifyAdmins({
      complaintId: id,
      type: "resolution",
      title: "Resolution awaiting verification",
      message: `${complaint.complaint_code} was resolved by ${user.fullName}. Please verify the work.`,
    });
  } else if (input.action === "request_info") {
    await notifyAdmins({
      complaintId: id,
      type: "request_info",
      title: "Staff requested more information",
      message: `${complaint.complaint_code}: ${message.slice(0, 300)}`,
    });
  }

  await logAudit({
    actor: user,
    action: `Staff ${input.action.replaceAll("_", " ")}`,
    entityType: "complaint",
    entityId: id,
    details: `${complaint.complaint_code} · ${message.slice(0, 300)}`,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, message: "Update recorded.", at: nowIso() });
}
