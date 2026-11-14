import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { reopenSchema } from "@/lib/validation";
import { getComplaint, transitionComplaint } from "@/lib/complaints";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { notifyAdmins, notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { nowIso, sanitizeText } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi();
  if (auth.response) return auth.response;
  const user = auth.user;
  const { id } = await params;

  const complaint = await getComplaint(id);
  if (!complaint) return apiError("Report not found.", 404);
  if (complaint.reporter_id !== user.id) return apiError("You can only reopen your own reports.", 403);
  if (!["resolved", "verified", "closed"].includes(complaint.status)) {
    return apiError("Only resolved or closed reports can be reopened.", 400);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = reopenSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Explain why the issue is not resolved.");
  }
  const reason = sanitizeText(parsed.data.reason);

  await transitionComplaint({
    complaint,
    toStatus: "reopened",
    actor: user,
    note: reason,
    fields: { reopen_reason: reason, resolved_at: complaint.resolved_at, closed_at: null, verified_at: null },
    notify: {
      title: "Report reopened",
      message: `${complaint.complaint_code} has been reopened. The campus team will review your update.`,
      type: "status",
    },
  });

  if (complaint.assigned_staff_id) {
    await notifyUser({
      userId: complaint.assigned_staff_id,
      complaintId: id,
      type: "reopened",
      title: "A resolved report was reopened",
      message: `${complaint.complaint_code}: ${reason.slice(0, 240)}`,
    });
  }
  await notifyAdmins({
    complaintId: id,
    type: "reopened",
    title: "Report reopened by reporter",
    message: `${complaint.complaint_code} · ${reason.slice(0, 200)}`,
  });
  await logAudit({
    actor: user,
    action: "Reopened a report",
    entityType: "complaint",
    entityId: id,
    details: `${complaint.complaint_code} · ${reason.slice(0, 300)}`,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, message: "Report reopened.", at: nowIso() }, { status: 201 });
}
