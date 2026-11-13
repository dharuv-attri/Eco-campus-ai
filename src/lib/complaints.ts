import "server-only";
import { randomUUID } from "node:crypto";
import { all, one, run, transaction } from "@/lib/db";
import { nowIso } from "@/lib/utils";
import { notifyAdmins, notifyDepartmentStaff, notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import type { Complaint, FullComplaint, SessionUser } from "@/types";

export const COMPLAINT_SELECT = `
  SELECT c.*,
    u.full_name AS reporter_name,
    u.email AS reporter_email,
    d.name AS department_name,
    s.full_name AS staff_name,
    l.name AS location_name,
    (SELECT COUNT(*) FROM complaint_images ci WHERE ci.complaint_id = c.id) AS image_count,
    (SELECT f.rating FROM complaint_feedback f WHERE f.complaint_id = c.id) AS rating
  FROM complaints c
  LEFT JOIN users u ON u.id = c.reporter_id
  LEFT JOIN departments d ON d.id = c.assigned_department_id
  LEFT JOIN users s ON s.id = c.assigned_staff_id
  LEFT JOIN campus_locations l ON l.id = c.location_id
`;

export function complaintCode(year = new Date().getFullYear()) {
  return transaction(() => {
    const prefix = `ECO-${year}-`;
    const row = one<{ max_code: string | null }>(
      "SELECT MAX(complaint_code) AS max_code FROM complaints WHERE complaint_code LIKE ?",
      `${prefix}%`,
    );
    const last = row?.max_code ? Number(row.max_code.slice(prefix.length)) : 0;
    return `${prefix}${String(last + 1).padStart(5, "0")}`;
  });
}

export function getComplaint(id: string): FullComplaint | null {
  const base = one<FullComplaint>(`${COMPLAINT_SELECT} WHERE c.id = ?`, id);
  if (!base) return null;
  return hydrateComplaint(base);
}

export function getComplaintByCode(code: string): FullComplaint | null {
  const base = one<FullComplaint>(`${COMPLAINT_SELECT} WHERE c.complaint_code = ?`, code);
  if (!base) return null;
  return hydrateComplaint(base);
}

function hydrateComplaint(base: FullComplaint): FullComplaint {
  const images = all<FullComplaint["images"][number]>(
    "SELECT id, url, kind, created_at FROM complaint_images WHERE complaint_id = ? ORDER BY created_at ASC",
    base.id,
  );
  const history = all<FullComplaint["history"][number]>(
    `SELECT h.*, u.full_name AS changed_by_name
     FROM complaint_status_history h LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.complaint_id = ? ORDER BY h.created_at ASC`,
    base.id,
  );
  const staffUpdates = all<FullComplaint["staff_updates"][number]>(
    `SELECT su.*, u.full_name AS staff_name
     FROM staff_updates su LEFT JOIN users u ON u.id = su.staff_id
     WHERE su.complaint_id = ? ORDER BY su.created_at ASC`,
    base.id,
  );
  const feedback = one<NonNullable<FullComplaint["feedback"]>>(
    "SELECT * FROM complaint_feedback WHERE complaint_id = ?",
    base.id,
  );
  const assignments = all<NonNullable<FullComplaint["assignments"]>[number]>(
    `SELECT a.*, d.name AS department_name, s.full_name AS staff_name
     FROM complaint_assignments a
     LEFT JOIN departments d ON d.id = a.department_id
     LEFT JOIN users s ON s.id = a.staff_id
     WHERE a.complaint_id = ? ORDER BY a.created_at DESC`,
    base.id,
  );
  return { ...base, images, history, staff_updates: staffUpdates, feedback, assignments };
}

export function listPublicComplaints(limit = 6) {
  return all<FullComplaint>(
    `${COMPLAINT_SELECT} WHERE c.status NOT IN ('rejected') ORDER BY c.created_at DESC LIMIT ?`,
    limit,
  );
}

export function listComplaintsForMap() {
  return all<FullComplaint>(
    `${COMPLAINT_SELECT}
     WHERE c.status NOT IN ('rejected')
       AND ((c.lat IS NOT NULL AND c.lng IS NOT NULL) OR c.location_id IS NOT NULL)
     ORDER BY c.created_at DESC LIMIT 500`,
  );
}

export function recordHistory(input: {
  complaintId: string;
  fromStatus: string | null;
  toStatus: string;
  note?: string | null;
  changedBy?: string | null;
}) {
  run(
    `INSERT INTO complaint_status_history (id, complaint_id, from_status, to_status, note, changed_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    input.complaintId,
    input.fromStatus,
    input.toStatus,
    input.note ?? null,
    input.changedBy ?? null,
    nowIso(),
  );
}

export function addAssignment(input: {
  complaintId: string;
  departmentId?: string | null;
  staffId?: string | null;
  assignedBy: string;
  note?: string | null;
}) {
  run(
    `INSERT INTO complaint_assignments (id, complaint_id, department_id, staff_id, assigned_by, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    input.complaintId,
    input.departmentId ?? null,
    input.staffId ?? null,
    input.assignedBy,
    input.note?.slice(0, 1000) ?? null,
    nowIso(),
  );
}

export function updateComplaintFields(id: string, fields: Record<string, string | number | null>) {
  const allowed = new Set([
    "assigned_department_id",
    "assigned_staff_id",
    "admin_notes",
    "resolution_notes",
    "rejection_reason",
    "reopen_reason",
    "priority",
    "status",
    "resolved_at",
    "verified_at",
    "closed_at",
    "points_awarded",
    "anonymous",
  ]);
  const entries = Object.entries(fields).filter(([key]) => allowed.has(key));
  if (!entries.length) return;
  const assignments = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value);
  run(`UPDATE complaints SET ${assignments}, updated_at = ? WHERE id = ?`, ...values, nowIso(), id);
}

export function suggestDepartmentId(category: string) {
  const departments = all<{ id: string; handles_categories: string | null }>(
    "SELECT id, handles_categories FROM departments",
  );
  for (const dept of departments) {
    try {
      const categories = JSON.parse(dept.handles_categories || "[]") as string[];
      if (categories.includes(category)) return dept.id;
    } catch {
      // Ignore malformed configuration rather than blocking a report.
    }
  }
  return null;
}

export function awardVerificationPoints(complaintId: string, actor?: SessionUser | null) {
  const complaint = one<{
    id: string;
    reporter_id: string;
    complaint_code: string;
    is_demo: number;
    points_awarded: number;
  }>(
    "SELECT id, reporter_id, complaint_code, is_demo, points_awarded FROM complaints WHERE id = ?",
    complaintId,
  );
  if (!complaint || complaint.points_awarded === 1) return false;
  transaction(() => {
    run(
      `INSERT OR IGNORE INTO leaderboard_points (id, user_id, points, reason, complaint_id, is_demo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      complaint.reporter_id,
      20,
      `Verified environmental report ${complaint.complaint_code}`,
      complaint.id,
      0,
      nowIso(),
    );
    updateComplaintFields(complaint.id, { points_awarded: 1 });
  });
  notifyUser({
    userId: complaint.reporter_id,
    complaintId: complaint.id,
    type: "points",
    title: "Green points awarded",
    message: `You earned 20 green points for verified report ${complaint.complaint_code}.`,
  });
  logAudit({
    actor,
    action: "Awarded verified-report points",
    entityType: "complaint",
    entityId: complaint.id,
    details: complaint.complaint_code,
  });
  return true;
}

export function transitionComplaint(input: {
  complaint: { id: string; complaint_code: string; status: string; reporter_id: string; location_name?: string | null };
  toStatus: string;
  actor: SessionUser;
  note?: string;
  notify?: { title: string; message: string; type?: string } | null;
  fields?: Record<string, string | number | null>;
}) {
  updateComplaintFields(input.complaint.id, {
    status: input.toStatus,
    ...(input.fields ?? {}),
  });
  recordHistory({
    complaintId: input.complaint.id,
    fromStatus: input.complaint.status,
    toStatus: input.toStatus,
    note: input.note ?? null,
    changedBy: input.actor.id,
  });
  if (input.notify !== null) {
    notifyUser({
      userId: input.complaint.reporter_id,
      complaintId: input.complaint.id,
      type: input.notify?.type ?? "status",
      title: input.notify?.title ?? "Complaint status updated",
      message:
        input.notify?.message ??
        `${input.complaint.complaint_code} is now ${input.toStatus.replaceAll("_", " ")}.`,
    });
  }
}

export function duplicateCandidates(input: {
  userId: string;
  category: string;
  locationId?: string | null;
  building?: string | null;
  title: string;
}) {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const rows = all<FullComplaint>(
    `${COMPLAINT_SELECT}
     WHERE c.reporter_id = ?
       AND c.category = ?
       AND c.created_at > ?
       AND c.status NOT IN ('closed','rejected')
     ORDER BY c.created_at DESC LIMIT 5`,
    input.userId,
    input.category,
    cutoff,
  );
  return rows.filter((row) => {
    if (input.locationId && row.location_id === input.locationId) return true;
    const buildingMatch =
      input.building && row.building
        ? input.building.toLowerCase().trim() === row.building.toLowerCase().trim()
        : false;
    const tokens = input.title
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 4);
    const rowTitle = row.title.toLowerCase();
    const titleMatch = tokens.some((token) => rowTitle.includes(token));
    return buildingMatch || titleMatch;
  });
}

export function displayReporter(complaint: { anonymous: number; reporter_name?: string | null }) {
  return complaint.anonymous === 1 ? "Anonymous reporter" : complaint.reporter_name || "Campus member";
}

export interface ComplaintFilters {
  reporterId?: string;
  /** Restricts staff results to work assigned to them or to their department. */
  staffAccess?: { userId: string; departmentId?: string | null };
  departmentId?: string;
  staffId?: string;
  status?: string;
  category?: string;
  priority?: string;
  q?: string;
  demo?: boolean;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

function complaintWhere(filters: ComplaintFilters) {
  const clauses: string[] = [];
  const params: Array<string | number> = [];
  if (filters.reporterId) {
    clauses.push("c.reporter_id = ?");
    params.push(filters.reporterId);
  }
  if (filters.staffAccess) {
    if (filters.staffAccess.departmentId) {
      clauses.push("(c.assigned_staff_id = ? OR c.assigned_department_id = ?)");
      params.push(filters.staffAccess.userId, filters.staffAccess.departmentId);
    } else {
      clauses.push("c.assigned_staff_id = ?");
      params.push(filters.staffAccess.userId);
    }
  }
  if (filters.departmentId) {
    clauses.push("c.assigned_department_id = ?");
    params.push(filters.departmentId);
  }
  if (filters.staffId) {
    clauses.push("c.assigned_staff_id = ?");
    params.push(filters.staffId);
  }
  if (filters.status) {
    clauses.push("c.status = ?");
    params.push(filters.status);
  }
  if (filters.category) {
    clauses.push("c.category = ?");
    params.push(filters.category);
  }
  if (filters.priority) {
    clauses.push("c.priority = ?");
    params.push(filters.priority);
  }
  if (filters.demo !== undefined) {
    clauses.push("c.is_demo = ?");
    params.push(filters.demo ? 1 : 0);
  }
  if (filters.from) {
    clauses.push("c.created_at >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push("c.created_at <= ?");
    params.push(filters.to);
  }
  if (filters.q) {
    clauses.push(
      "(c.title LIKE ? OR c.description LIKE ? OR c.complaint_code LIKE ? OR c.building LIKE ? OR c.specific_location LIKE ?)",
    );
    const like = `%${filters.q.slice(0, 100)}%`;
    params.push(like, like, like, like, like);
  }
  const clause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { clause, params };
}

export function listComplaints(filters: ComplaintFilters = {}): Complaint[] {
  const where = complaintWhere(filters);
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);
  return all<Complaint>(
    `${COMPLAINT_SELECT} ${where.clause} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
    ...where.params,
    limit,
    offset,
  );
}

export function countComplaints(filters: ComplaintFilters = {}) {
  const where = complaintWhere(filters);
  const row = one<{ count: number }>(
    `SELECT COUNT(*) AS count FROM complaints c ${where.clause}`,
    ...where.params,
  );
  return row?.count ?? 0;
}

export function getStatusCounts(filters: ComplaintFilters = {}) {
  const where = complaintWhere(filters);
  const rows = all<{ status: string; count: number }>(
    `SELECT c.status, COUNT(*) AS count FROM complaints c ${where.clause} GROUP BY c.status`,
    ...where.params,
  );
  return Object.fromEntries(rows.map((row) => [row.status, row.count])) as Record<string, number>;
}
