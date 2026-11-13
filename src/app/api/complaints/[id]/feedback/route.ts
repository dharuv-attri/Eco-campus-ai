import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { feedbackSchema } from "@/lib/validation";
import { one, run } from "@/lib/db";
import { getComplaint } from "@/lib/complaints";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { nowIso, sanitizeText } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi();
  if (auth.response) return auth.response;
  const user = auth.user;
  const { id } = await params;

  const complaint = getComplaint(id);
  if (!complaint) return apiError("Report not found.", 404);
  if (complaint.reporter_id !== user.id && user.role !== "admin" && user.role !== "super_admin") {
    return apiError("You can only review your own reports.", 403);
  }
  if (!["resolved", "verified", "closed"].includes(complaint.status)) {
    return apiError("Feedback can be added once the issue is resolved.", 400);
  }
  const existing = one<{ id: string }>("SELECT id FROM complaint_feedback WHERE complaint_id = ?", id);
  if (existing) return apiError("Feedback has already been submitted for this report.", 409);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = feedbackSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Check your feedback.");
  }

  run(
    `INSERT INTO complaint_feedback (id, complaint_id, user_id, rating, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    id,
    user.id,
    parsed.data.rating,
    sanitizeText(parsed.data.comment) || null,
    nowIso(),
  );

  if (complaint.assigned_staff_id) {
    notifyUser({
      userId: complaint.assigned_staff_id,
      complaintId: id,
      type: "feedback",
      title: "New feedback on your resolved work",
      message: `${complaint.complaint_code} received a ${parsed.data.rating}/5 rating.`,
    });
  }
  logAudit({
    actor: user,
    action: "Submitted resolution feedback",
    entityType: "complaint",
    entityId: id,
    details: `${complaint.complaint_code} · ${parsed.data.rating}/5`,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, message: "Thank you for your feedback." }, { status: 201 });
}
