import "server-only";
import { all, one } from "@/lib/db";
import type { SessionUser } from "@/types";

export function getPublicStats() {
  const row = one<{
    total: number;
    resolved: number;
    pending: number;
    in_progress: number;
    rejected: number;
    demo: number;
    this_month: number;
  }>(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status IN ('verified','closed') THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN status IN ('submitted','under_review') THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status IN ('assigned','in_progress','reopened') THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) AS demo,
      SUM(CASE WHEN substr(created_at,1,7) = substr(?,1,7) THEN 1 ELSE 0 END) AS this_month
     FROM complaints`,
    new Date().toISOString(),
  );
  const students = one<{ count: number }>(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND status = 'active'",
  );
  return {
    total: row?.total ?? 0,
    resolved: row?.resolved ?? 0,
    pending: row?.pending ?? 0,
    inProgress: row?.in_progress ?? 0,
    rejected: row?.rejected ?? 0,
    demo: row?.demo ?? 0,
    thisMonth: row?.this_month ?? 0,
    students: students?.count ?? 0,
  };
}

export function getAdminStats() {
  const complaints = one<{
    total: number;
    pending: number;
    assigned: number;
    in_progress: number;
    resolved: number;
    verified: number;
    closed: number;
    rejected: number;
    reopened: number;
    demo: number;
    avg_resolution_hours: number | null;
  }>(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'submitted' OR status = 'under_review' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) AS assigned,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN status = 'reopened' THEN 1 ELSE 0 END) AS reopened,
      SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) AS demo,
      AVG(CASE WHEN resolved_at IS NOT NULL THEN (julianday(resolved_at) - julianday(created_at)) * 24 END) AS avg_resolution_hours
     FROM complaints`,
  );
  const users = one<{ total: number; students: number; staff: number; pending_staff: number }>(
    `SELECT COUNT(*) AS total,
      SUM(CASE WHEN role = 'student' AND status = 'active' THEN 1 ELSE 0 END) AS students,
      SUM(CASE WHEN role = 'staff' AND status = 'active' THEN 1 ELSE 0 END) AS staff,
      SUM(CASE WHEN role = 'staff' AND status = 'pending' THEN 1 ELSE 0 END) AS pending_staff
     FROM users`,
  );
  return {
    complaints: {
      total: complaints?.total ?? 0,
      pending: complaints?.pending ?? 0,
      assigned: complaints?.assigned ?? 0,
      inProgress: complaints?.in_progress ?? 0,
      resolved: complaints?.resolved ?? 0,
      verified: complaints?.verified ?? 0,
      closed: complaints?.closed ?? 0,
      rejected: complaints?.rejected ?? 0,
      reopened: complaints?.reopened ?? 0,
      demo: complaints?.demo ?? 0,
      avgResolutionHours: complaints?.avg_resolution_hours ?? null,
    },
    users: {
      total: users?.total ?? 0,
      students: users?.students ?? 0,
      staff: users?.staff ?? 0,
      pendingStaff: users?.pending_staff ?? 0,
    },
  };
}

export function getStatusBreakdown() {
  return all<{ status: string; count: number }>(
    "SELECT status, COUNT(*) AS count FROM complaints GROUP BY status ORDER BY count DESC",
  );
}

export function getCategoryBreakdown() {
  return all<{ category: string; count: number }>(
    "SELECT category, COUNT(*) AS count FROM complaints GROUP BY category ORDER BY count DESC LIMIT 12",
  );
}

export function getDepartmentBreakdown() {
  return all<{ department: string; total: number; resolved: number }>(
    `SELECT COALESCE(d.name, 'Unassigned') AS department,
       COUNT(c.id) AS total,
       SUM(CASE WHEN c.status IN ('resolved','verified','closed') THEN 1 ELSE 0 END) AS resolved
     FROM complaints c LEFT JOIN departments d ON d.id = c.assigned_department_id
     GROUP BY c.assigned_department_id ORDER BY total DESC`,
  );
}

export function getMonthlyTrend() {
  const rows = all<{ month: string; count: number; resolved: number }>(
    `SELECT substr(created_at, 1, 7) AS month,
       COUNT(*) AS count,
       SUM(CASE WHEN status IN ('resolved','verified','closed') THEN 1 ELSE 0 END) AS resolved
     FROM complaints
     WHERE created_at >= date('now', '-5 months', 'start of month')
     GROUP BY month ORDER BY month ASC`,
  );
  return rows;
}

export function getStudentStats(userId: string) {
  const row = one<{ total: number; open: number; resolved: number; pending: number }>(
    `SELECT COUNT(*) AS total,
      SUM(CASE WHEN status NOT IN ('closed','rejected','verified') THEN 1 ELSE 0 END) AS open,
      SUM(CASE WHEN status IN ('verified','closed') THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN status IN ('submitted','under_review') THEN 1 ELSE 0 END) AS pending
     FROM complaints WHERE reporter_id = ?`,
    userId,
  );
  const points = one<{ total: number }>(
    "SELECT COALESCE(SUM(points),0) AS total FROM leaderboard_points WHERE user_id = ?",
    userId,
  );
  const unread = one<{ count: number }>(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0",
    userId,
  );
  return {
    total: row?.total ?? 0,
    open: row?.open ?? 0,
    resolved: row?.resolved ?? 0,
    pending: row?.pending ?? 0,
    points: points?.total ?? 0,
    unread: unread?.count ?? 0,
  };
}

export function getStaffStats(user: SessionUser) {
  const params: string[] = [user.id];
  let deptClause = "";
  if (user.departmentId) {
    deptClause = " OR assigned_department_id = ?";
    params.push(user.departmentId);
  }
  const row = one<{
    total: number;
    assigned: number;
    in_progress: number;
    resolved: number;
    high: number;
  }>(
    `SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) AS assigned,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status IN ('resolved','verified','closed') THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN priority IN ('high','emergency') AND status NOT IN ('resolved','verified','closed','rejected') THEN 1 ELSE 0 END) AS high
     FROM complaints WHERE (assigned_staff_id = ?${deptClause})`,
    ...params,
  );
  return {
    total: row?.total ?? 0,
    assigned: row?.assigned ?? 0,
    inProgress: row?.in_progress ?? 0,
    resolved: row?.resolved ?? 0,
    highPriority: row?.high ?? 0,
  };
}

export interface LeaderboardRow {
  user_id: string;
  full_name: string;
  department: string | null;
  profile_image: string | null;
  points: number;
  is_demo: number;
  rank: number;
}

export function getLeaderboard(period: "week" | "month" | "all" = "all", limit = 10): LeaderboardRow[] {
  let dateClause = "";
  if (period === "week") dateClause = "AND lp.created_at >= datetime('now', '-7 days')";
  if (period === "month") dateClause = "AND lp.created_at >= datetime('now', '-30 days')";
  const rows = all<Omit<LeaderboardRow, "rank">>(
    `SELECT lp.user_id, u.full_name, u.department, u.profile_image,
       SUM(lp.points) AS points,
       MAX(u.is_demo) AS is_demo
     FROM leaderboard_points lp JOIN users u ON u.id = lp.user_id
     WHERE u.role = 'student' ${dateClause}
     GROUP BY lp.user_id ORDER BY points DESC, u.full_name ASC LIMIT ?`,
    limit,
  );
  return rows.map((row, index) => ({ ...row, rank: index + 1, points: Number(row.points) }));
}

export function getDepartmentLeaderboard() {
  return all<{ department: string; points: number; members: number }>(
    `SELECT COALESCE(u.department, 'Unassigned') AS department,
       SUM(lp.points) AS points,
       COUNT(DISTINCT lp.user_id) AS members
     FROM leaderboard_points lp JOIN users u ON u.id = lp.user_id
     WHERE u.role = 'student'
     GROUP BY u.department ORDER BY points DESC LIMIT 10`,
  );
}

export function getUserPoints(userId: string) {
  const row = one<{ total: number }>(
    "SELECT COALESCE(SUM(points),0) AS total FROM leaderboard_points WHERE user_id = ?",
    userId,
  );
  return row?.total ?? 0;
}

export function getResolutionPerformance() {
  return all<{
    department: string;
    total: number;
    resolved: number;
    avg_hours: number | null;
  }>(
    `SELECT COALESCE(d.name, 'Unassigned') AS department,
       COUNT(c.id) AS total,
       SUM(CASE WHEN c.status IN ('resolved','verified','closed') THEN 1 ELSE 0 END) AS resolved,
       AVG(CASE WHEN c.resolved_at IS NOT NULL THEN (julianday(c.resolved_at) - julianday(c.created_at)) * 24 END) AS avg_hours
     FROM complaints c LEFT JOIN departments d ON d.id = c.assigned_department_id
     GROUP BY c.assigned_department_id ORDER BY total DESC`,
  );
}
