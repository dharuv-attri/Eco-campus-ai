import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { adminComplaintSchema } from "@/lib/validation";
import { one, run } from "@/lib/db";
import {
  addAssignment,
  awardVerificationPoints,
  getComplaint,
  transitionComplaint,
  updateComplaintFields,
} from "@/lib/complaints";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { notifyDepartmentStaff, notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { nowIso, sanitizeText } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi(["admin", "super_admin"]);
  if (auth.response) return auth.response;
  const user = auth.user;
  const { id } = await params;

  const complaint = getComplaint(id);
  if (!complaint) return apiError("Report not found.", 404);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = adminComplaintSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Check the action details.");
  }
  const input = parsed.data;
  const note = sanitizeText(input.note ?? "");

  switch (input.action) {
    case "review": {
      if (!["submitted", "reopened"].includes(complaint.status)) {
        return apiError("This report is already under review or assigned.");
      }
      transitionComplaint({
        complaint,
        toStatus: "under_review",
        actor: user,
        note: note || "Report is being reviewed by the campus administrator.",
        notify: {
          title: "Report under review",
          message: `${complaint.complaint_code} is being reviewed by the campus administrator.`,
        },
      });
      break;
    }
    case "assign": {
      if (!input.departmentId) return apiError("Select a department to assign this report.");
      const department = one<{ id: string; name: string }>(
        "SELECT id, name FROM departments WHERE id = ?",
        input.departmentId,
      );
      if (!department) return apiError("Department not found.");
      let staffId = input.staffId || null;
      if (staffId) {
        const staff = one<{ id: string; full_name: string; role: string; status: string }>(
          "SELECT id, full_name, role, status FROM users WHERE id = ?",
          staffId,
        );
        if (!staff || staff.role !== "staff" || staff.status !== "active") {
          return apiError("Select an active staff member.");
        }
      } else {
        staffId = null;
      }
      transitionComplaint({
        complaint,
        toStatus: "assigned",
        actor: user,
        note: note || `Assigned to ${department.name}.`,
        fields: {
          assigned_department_id: department.id,
          assigned_staff_id: staffId,
        },
        notify: {
          title: "Report assigned to a department",
          message: `${complaint.complaint_code} has been assigned to ${department.name}.`,
        },
      });
      addAssignment({
        complaintId: id,
        departmentId: department.id,
        staffId,
        assignedBy: user.id,
        note: note || null,
      });
      notifyDepartmentStaff({
        departmentId: department.id,
        complaintId: id,
        type: "assigned",
        title: "New work assigned",
        message: `${complaint.complaint_code} · ${complaint.title}`,
      });
      if (staffId) {
        notifyUser({
          userId: staffId,
          complaintId: id,
          type: "assigned",
          title: "You were assigned a report",
          message: `${complaint.complaint_code} is now assigned to you.`,
        });
      }
      break;
    }
    case "priority": {
      if (!input.priority) return apiError("Select a priority.");
      updateComplaintFields(id, { priority: input.priority });
      notifyUser({
        userId: complaint.reporter_id,
        complaintId: id,
        type: "priority",
        title: "Priority updated",
        message: `${complaint.complaint_code} priority is now ${input.priority}.`,
      });
      break;
    }
    case "status": {
      if (!input.status) return apiError("Select a status.");
      const allowed = ["submitted", "under_review", "assigned", "in_progress", "resolved", "verified", "closed"];
      if (!allowed.includes(input.status)) return apiError("That status cannot be set manually.");
      const fields: Record<string, string | number | null> = {};
      if (input.status === "resolved" && !complaint.resolved_at) fields.resolved_at = nowIso();
      if (input.status === "verified" && !complaint.verified_at) fields.verified_at = nowIso();
      if (input.status === "closed") fields.closed_at = nowIso();
      transitionComplaint({
        complaint,
        toStatus: input.status,
        actor: user,
        note: note || `Status manually set to ${input.status.replaceAll("_", " ")}.`,
        fields,
        notify: {
          title: "Report status updated",
          message: `${complaint.complaint_code} is now ${input.status.replaceAll("_", " ")}.`,
        },
      });
      if (input.status === "verified") awardVerificationPoints(id, user);
      break;
    }
    case "note": {
      if (note.length < 2) return apiError("Add a note.");
      updateComplaintFields(id, { admin_notes: note });
      break;
    }
    case "reject": {
      const reason = sanitizeText(input.reason ?? "");
      if (reason.length < 10) return apiError("Add a clear rejection reason (at least 10 characters).");
      transitionComplaint({
        complaint,
        toStatus: "rejected",
        actor: user,
        note: reason,
        fields: { rejection_reason: reason },
        notify: {
          title: "Report not accepted",
          message: `${complaint.complaint_code} was not accepted. Reason: ${reason.slice(0, 300)}`,
        },
      });
      break;
    }
    case "verify": {
      if (complaint.status !== "resolved") return apiError("Only resolved reports can be verified.");
      transitionComplaint({
        complaint,
        toStatus: "verified",
        actor: user,
        note: note || "Resolution verified by the campus administrator.",
        fields: { verified_at: nowIso() },
        notify: {
          title: "Resolution verified — green points awarded",
          message: `${complaint.complaint_code} has been verified. Thank you for helping improve the campus.`,
        },
      });
      awardVerificationPoints(id, user);
      break;
    }
    case "close": {
      if (!["verified", "resolved"].includes(complaint.status)) {
        return apiError("Only resolved or verified reports can be closed.");
      }
      transitionComplaint({
        complaint,
        toStatus: "closed",
        actor: user,
        note: note || "Report closed after confirmation.",
        fields: { closed_at: nowIso() },
        notify: {
          title: "Report closed",
          message: `${complaint.complaint_code} has been closed. Thank you for your contribution.`,
        },
      });
      break;
    }
    case "reopen": {
      const reason = sanitizeText(input.reason ?? "");
      if (reason.length < 10) return apiError("Add a clear reason for reopening.");
      if (!["resolved", "verified", "closed", "rejected"].includes(complaint.status)) {
        return apiError("This report is already open.");
      }
      transitionComplaint({
        complaint,
        toStatus: "reopened",
        actor: user,
        note: reason,
        fields: { reopen_reason: reason, closed_at: null, verified_at: null },
        notify: {
          title: "Report reopened",
          message: `${complaint.complaint_code} has been reopened: ${reason.slice(0, 260)}`,
        },
      });
      break;
    }
    case "restore": {
      if (complaint.status !== "archived") return apiError("Only archived reports can be restored.");
      const archivedFrom = one<{ from_status: string | null }>(
        "SELECT from_status FROM complaint_status_history WHERE complaint_id = ? AND to_status = 'archived' ORDER BY created_at DESC LIMIT 1",
        id,
      )?.from_status;
      const restorableStatuses = [
        "submitted",
        "under_review",
        "assigned",
        "in_progress",
        "resolved",
        "verified",
        "closed",
        "rejected",
        "reopened",
      ];
      const restoredStatus =
        archivedFrom && restorableStatuses.includes(archivedFrom) ? archivedFrom : "under_review";
      transitionComplaint({
        complaint,
        toStatus: restoredStatus,
        actor: user,
        note: note || "Report restored from the archive.",
        notify: {
          title: "Report restored",
          message: `${complaint.complaint_code} was restored to ${restoredStatus.replaceAll("_", " ")}.`,
        },
      });
      break;
    }
    case "restore": {
      if (complaint.status !== "archived") return apiError("Only archived reports can be restored.");
      const archivedFrom = one<{ from_status: string | null }>(
        "SELECT from_status FROM complaint_status_history WHERE complaint_id = ? AND to_status = 'archived' ORDER BY created_at DESC LIMIT 1",
        id,
      )?.from_status;
      const restorableStatuses = [
        "submitted",
        "under_review",
        "assigned",
        "in_progress",
        "resolved",
        "verified",
        "closed",
        "rejected",
        "reopened",
      ];
      const restoredStatus =
        archivedFrom && restorableStatuses.includes(archivedFrom) ? archivedFrom : "under_review";
      transitionComplaint({
        complaint,
        toStatus: restoredStatus,
        actor: user,
        note: note || "Report restored from the archive.",
        notify: {
          title: "Report restored",
          message: `${complaint.complaint_code} was restored to ${restoredStatus.replaceAll("_", " ")}.`,
        },
      });
      break;
    }
    case "delete_demo": {
      if (!complaint.is_demo) return apiError("Only demo records can be deleted.", 403);
      run("DELETE FROM complaints WHERE id = ? AND is_demo = 1", id);
      logAudit({
        actor: user,
        action: "Deleted a demo complaint",
        entityType: "complaint",
        entityId: id,
        details: complaint.complaint_code,
        ip: clientIp(req),
      });
      return NextResponse.json({ ok: true, deleted: true });
    }
    default:
      return apiError("Unsupported action.");
  }

  logAudit({
    actor: user,
    action: `Admin complaint action: ${input.action}`,
    entityType: "complaint",
    entityId: id,
    details: `${complaint.complaint_code}${note ? ` · ${note.slice(0, 300)}` : ""}`,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, message: "Report updated." });
}
