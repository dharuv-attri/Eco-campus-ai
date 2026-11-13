import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { one, run } from "@/lib/db";
import { ROLE_HOME } from "@/lib/constants";
import { createSupabaseClient } from "@/lib/supabase";
import { nowIso } from "@/lib/utils";
import type { LoginRole, Role, SessionUser } from "@/types";

interface DbUserRow {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: string;
  email_verified: number;
  is_demo: number;
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

export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
  if (!hasSessionCookie) return null;

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (error.name === "AuthSessionMissingError") return null;
    console.error("Could not validate the Supabase session:", error.message);
    return null;
  }

  const email = data.user?.email?.trim().toLowerCase();
  if (!email || !data.user?.email_confirmed_at) return null;

  const row = one<DbUserRow>(
    "SELECT * FROM users WHERE lower(email) = ?",
    email,
  );
  if (!row || row.is_demo === 1 || ["suspended", "deleted", "pending"].includes(row.status)) return null;

  if (row.email_verified !== 1) {
    run("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?", nowIso(), row.id);
    row.email_verified = 1;
  }
  return toSessionUser(row);
});

export async function destroySession() {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error && error.name !== "AuthSessionMissingError") return { error };
  if (!data.session) return { error: null };
  const result = await supabase.auth.signOut({ scope: "local" });
  return result.error?.name === "AuthSessionMissingError" ? { error: null } : result;
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

export function matchesLoginRole(actual: Role, requested?: LoginRole) {
  if (!requested) return true;
  return requested === "admin" ? actual === "admin" || actual === "super_admin" : actual === requested;
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
