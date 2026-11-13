import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { userAdminSchema } from "@/lib/validation";
import { one, run, transaction } from "@/lib/db";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { nowIso } from "@/lib/utils";
import type { Role } from "@/types";
import { createSupabaseClient } from "@/lib/supabase";
import { appBaseUrlForRequest } from "@/lib/email";

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

  if (input.action === "reset_password" && !isSuper) {
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
      break;
    }
    case "reactivate": {
      if (!["suspended", "deleted"].includes(target.status)) return apiError("This account is already active.");
      run("UPDATE users SET status = 'active', updated_at = ? WHERE id = ?", nowIso(), id);
      break;
    }
    case "remove": {
      const removal = transaction(() => {
        const current = one<{ role: Role; status: string }>(
          "SELECT role, status FROM users WHERE id = ?",
          id,
        );
        if (!current) return "missing";
        if (current.status === "deleted") return "deleted";
        if (
          !isSuper &&
          (current.role === "admin" || current.role === "super_admin")
        ) {
          return "forbidden";
        }
        if (current.role === "super_admin" && current.status === "active") {
          const remaining = one<{ count: number }>(
            "SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin' AND status = 'active' AND id != ?",
            id,
          );
          if ((remaining?.count ?? 0) === 0) return "last_super_admin";
        }
        run("UPDATE users SET status = 'deleted', updated_at = ? WHERE id = ?", nowIso(), id);
        return "removed";
      });
      if (removal === "missing") return apiError("User not found.", 404);
      if (removal === "deleted") return apiError("This account is already removed.");
      if (removal === "forbidden") {
        return apiError("Only a super administrator can manage administrator accounts.", 403);
      }
      if (removal === "last_super_admin") {
        return apiError("At least one active super administrator must remain.", 400);
      }
      break;
    }
    case "role": {
      if (!input.role) return apiError("Select a role.");
      if (!isSuper && input.role !== "student" && input.role !== "staff") {
        return apiError("Only a super administrator can grant administrator roles.", 403);
      }
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
      notifyUser({
        userId: id,
        type: "account",
        title: "Your account role changed",
        message: `An administrator changed your role to ${input.role.replaceAll("_", " ")}. Your access now reflects this role.`,
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
      let supabase;
      try {
        supabase = await createSupabaseClient();
      } catch (error) {
        return apiError(error instanceof Error ? error.message : "Supabase Auth is not configured.", 503);
      }
      const { error } = await supabase.auth.resetPasswordForEmail(target.email, {
        redirectTo: `${appBaseUrlForRequest(req.nextUrl)}/api/auth/google/callback?next=/reset-password`,
      });
      if (error) return apiError(error.message || "Could not send a password reset email.", 502);
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
