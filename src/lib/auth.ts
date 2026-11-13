import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { one, run } from "@/lib/db";
import { ROLE_HOME } from "@/lib/constants";
import { nowIso } from "@/lib/utils";
import type { Role, SessionUser } from "@/types";

export const SESSION_COOKIE = "eco_session";
const SESSION_DAYS = 30;

interface DbUserRow {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: string;
  email_verified: number;
  profile_image: string | null;
  student_id: string | null;
  employee_id: string | null;
  course: string | null;
  department: string | null;
  department_id: string | null;
  year_semester: string | null;
  designation: string | null;
  created_at: string;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string | null) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export function toSessionUser(row: DbUserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    emailVerified: row.email_verified === 1,
    profileImage: row.profile_image,
    studentId: row.student_id,
    employeeId: row.employee_id,
    course: row.course,
    department: row.department,
    departmentId: row.department_id,
    yearSemester: row.year_semester,
    designation: row.designation,
    createdAt: row.created_at,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  const row = one<DbUserRow & { expires_at: string }>(
    `SELECT u.*, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?`,
    tokenHash,
  );
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    run("DELETE FROM sessions WHERE token_hash = ?", tokenHash);
    return null;
  }
  if (row.status === "suspended" || row.status === "deleted") return null;
  if (row.status === "pending") return null;
  return toSessionUser(row);
}

export async function createSession(
  userId: string,
  meta?: { ip?: string; userAgent?: string },
) {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(raw);
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  run(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, ip, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    userId,
    tokenHash,
    expires.toISOString(),
    meta?.ip ?? null,
    meta?.userAgent?.slice(0, 300) ?? null,
    nowIso(),
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return raw;
}

export async function destroySession() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    run("DELETE FROM sessions WHERE token_hash = ?", hashToken(raw));
  }
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function requireRole(roles: Role[], nextPath = "/") {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (!roles.includes(user.role)) {
    redirect(ROLE_HOME[user.role] ?? "/");
  }
  return user;
}

export async function requireUser(nextPath = "/") {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export function isAdmin(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "super_admin";
}

export function isSuperAdmin(user: SessionUser | null) {
  return user?.role === "super_admin";
}

export function isStaff(user: SessionUser | null) {
  return user?.role === "staff";
}

export function isStudent(user: SessionUser | null) {
  return user?.role === "student";
}

export function canAccessComplaint(
  user: SessionUser,
  complaint: { reporter_id: string; assigned_staff_id: string | null; assigned_department_id: string | null },
) {
  if (user.role === "admin" || user.role === "super_admin") return true;
  if (user.role === "student") return complaint.reporter_id === user.id;
  if (user.role === "staff") {
    return (
      complaint.reporter_id === user.id ||
      complaint.assigned_staff_id === user.id ||
      (!!user.departmentId && complaint.assigned_department_id === user.departmentId)
    );
  }
  return false;
}

/** Staff may only change work assigned to them or their department — not reports they filed themselves. */
export function canManageComplaint(
  user: SessionUser,
  complaint: { assigned_staff_id: string | null; assigned_department_id: string | null },
) {
  if (user.role === "admin" || user.role === "super_admin") return true;
  if (user.role !== "staff") return false;
  return (
    complaint.assigned_staff_id === user.id ||
    (!!user.departmentId && complaint.assigned_department_id === user.departmentId)
  );
}
