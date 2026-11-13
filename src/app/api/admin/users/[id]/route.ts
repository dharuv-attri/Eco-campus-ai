import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { userAdminSchema } from "@/lib/validation";
import { one, run } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { nowIso } from "@/lib/utils";
import type { Role } from "@/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi(["admin", "super_admin"]);
  if (auth.response) return auth.response;
  const actor = auth.user;
  const { id } = await params;

  const target = one<{
    id: string;
    email: string;
    full_name: string;
    role: Role;
    status: string;
    department_id: string | null;
  }>("SELECT id, email, full_name, role, status, department_id FROM users WHERE id = ?", id);
  if (!target) return apiError("User not found.", 404);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = userAdminSchema.safeParse(json);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Check the action details.");
  const input = parsed.data;

  const isSuper = actor.role === "super_admin";
  const targetIsAdmin = target.role === "admin" || target.role === "super_admin";

  if (target.id === actor.id && input.action !== "department") {
    return apiError("You cannot change your own access or password here.", 403);
  }
  if (targetIsAdmin && !isSuper) {
    return apiError("Only a super administrator can manage administrator accounts.", 403);
  }

  if ((input.action === "role" || input.action === "reset_password") && !isSuper) {
    return apiError("Only a super administrator can perform this action.", 403);
  }

  switch (input.action) {
    case "approve": {
      if (target.status !== "pending") return apiError("This account is not awaiting approval.");
      run("UPDATE users SET status = 'active', updated_at = ? WHERE id = ?", nowIso(), id);
      notifyUser({
        userId: id,
        type: "account",
        title: "Your staff account is approved",
        message: "An administrator approved your staff account. You can now sign in and view assigned reports.",
      });
      break;
    }
    case "reject": {
      if (target.status !== "pending") return apiError("Only pending accounts can be rejected.");
      run("UPDATE users SET status = 'deleted', updated_at = ? WHERE id = ?", nowIso(), id);
      break;
    }
    case "suspend": {
      if (target.status === "suspended") return apiError("This account is already suspended.");
      run("UPDATE users SET status = 'suspended', updated_at = ? WHERE id = ?", nowIso(), id);
      run("DELETE FROM sessions WHERE user_id = ?", id);
      break;
    }
    case "reactivate": {
      if (!["suspended", "deleted"].includes(target.status)) return apiError("This account is already active.");
      run("UPDATE users SET status = 'active', updated_at = ? WHERE id = ?", nowIso(), id);
      break;
    }
    case "role": {
      if (!input.role) return apiError("Select a role.");
      if (target.role === "super_admin" && input.role !== "super_admin") {
        const remaining = one<{ count: number }>(
          "SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin' AND status = 'active' AND id != ?",
          id,
        );
        if ((remaining?.count ?? 0) === 0) {
          return apiError("At least one active super administrator is required.", 400);
        }
      }
      run(
        "UPDATE users SET role = ?, updated_at = ? WHERE id = ?",
        input.role,
        nowIso(),
        id,
      );
      run("DELETE FROM sessions WHERE user_id = ?", id);
      notifyUser({
        userId: id,
        type: "account",
        title: "Your account role changed",
        message: `An administrator changed your role to ${input.role.replaceAll("_", " ")}. Sign in again to continue.`,
      });
      break;
    }
    case "department": {
      if (target.role !== "staff") return apiError("Departments can only be assigned to staff accounts.");
      let departmentName: string | null = null;
      if (input.departmentId) {
        const department = one<{ id: string; name: string }>(
          "SELECT id, name FROM departments WHERE id = ?",
          input.departmentId,
        );
        if (!department) return apiError("Department not found.");
        departmentName = department.name;
      }
      run(
        "UPDATE users SET department_id = ?, department = ?, updated_at = ? WHERE id = ?",
        input.departmentId || null,
        departmentName,
        nowIso(),
        id,
      );
      break;
    }
    case "reset_password": {
      if (!input.newPassword || input.newPassword.length < 8) {
        return apiError("A new password of at least 8 characters is required.");
      }
      const passwordHash = await hashPassword(input.newPassword);
      run(
        "UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
        passwordHash,
        nowIso(),
        id,
      );
      run("DELETE FROM sessions WHERE user_id = ?", id);
      break;
    }
    default:
      return apiError("Unsupported action.");
  }

  logAudit({
    actor,
    action: `User administration: ${input.action}`,
    entityType: "user",
    entityId: id,
    details: `${target.email} · ${target.role}${input.role ? ` → ${input.role}` : ""}${input.reason ? ` · ${input.reason}` : ""}`,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, message: "User updated." });
}
