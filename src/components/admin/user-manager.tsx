"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  KeyRound,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCog,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { postJson } from "@/lib/client-api";
import { ROLE_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { PublicUser, Role } from "@/types";

type UserAction = "approve" | "reject" | "suspend" | "reactivate" | "role" | "department" | "reset_password";

export function UserManager({
  users,
  departments,
  actorRole,
  actorId,
}: {
  users: PublicUser[];
  departments: Array<{ id: string; name: string }>;
  actorRole: Role;
  actorId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<PublicUser | null>(null);
  const [action, setAction] = useState<UserAction>("approve");
  const [role, setRole] = useState<Role>("student");
  const [departmentId, setDepartmentId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const isSuper = actorRole === "super_admin";

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (statusFilter !== "all" && user.status !== statusFilter) return false;
      if (!needle) return true;
      return [user.full_name, user.email, user.student_id, user.employee_id, user.department]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [users, query, roleFilter, statusFilter]);

  function open(user: PublicUser, nextAction: UserAction) {
    setSelected(user);
    setAction(nextAction);
    setRole(user.role);
    setDepartmentId(user.department_id ?? "");
    setNewPassword("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const payload: Record<string, string | null> = { action };
      if (action === "role") payload.role = role;
      if (action === "department") payload.departmentId = departmentId || null;
      if (action === "reset_password") payload.newPassword = newPassword;
      await postJson(`/api/admin/users/${selected.id}`, payload);
      toast.success("User account updated.");
      setSelected(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="surface flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
            placeholder="Search name, email, student ID, employee ID…"
            aria-label="Search users"
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          aria-label="Filter by role"
          className="h-10 w-auto min-w-[150px] py-0 text-xs"
        >
          <option value="all">All roles</option>
          {Object.entries(ROLE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by status"
          className="h-10 w-auto min-w-[140px] py-0 text-xs"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending approval</option>
          <option value="suspended">Suspended</option>
          <option value="deleted">Deleted</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No matching users"
          description="Adjust your search or filters to find an account."
        />
      ) : (
        <div className="surface overflow-hidden">
          <div className="hidden grid-cols-[1.5fr_0.8fr_0.7fr_0.8fr_auto] gap-3 border-b bg-ink-50/70 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:bg-white/[0.03] lg:grid">
            <span>Account</span>
            <span>Role</span>
            <span>Status</span>
            <span>Joined</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y">
            {filtered.map((user) => {
              const protectedAdmin = (user.role === "admin" || user.role === "super_admin") && !isSuper;
              return (
                <li key={user.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[1.5fr_0.8fr_0.7fr_0.8fr_auto] lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={user.full_name} src={user.profile_image} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-semibold">
                        {user.full_name}
                        {user.is_demo ? <DemoBadge /> : null}
                        {user.id === actorId ? <Badge tone="emerald">You</Badge> : null}
                      </p>
                      <p className="truncate text-[11px] text-ink-500">{user.email}</p>
                      <p className="truncate text-[10px] text-ink-400">
                        {[user.student_id, user.employee_id, user.department, user.course].filter(Boolean).join(" · ") ||
                          "No profile details"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Badge tone="violet">{ROLE_LABEL[user.role] ?? user.role}</Badge>
                  </div>
                  <div>
                    <Badge
                      tone={user.status === "active" ? "emerald" : user.status === "pending" ? "amber" : "rose"}
                    >
                      {user.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-500">{formatDate(user.created_at)}</p>
                  <div className="flex flex-wrap gap-1.5 lg:justify-end">
                    {user.status === "pending" ? (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => open(user, "approve")}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => open(user, "reject")}>
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    ) : null}
                    {user.status === "active" && user.id !== actorId ? (
                      <Button size="sm" variant="outline" onClick={() => open(user, "suspend")}>
                        <ShieldOff className="h-3.5 w-3.5" /> Suspend
                      </Button>
                    ) : null}
                    {["suspended", "deleted"].includes(user.status) ? (
                      <Button size="sm" variant="secondary" onClick={() => open(user, "reactivate")}>
                        <UserRoundCheck className="h-3.5 w-3.5" /> Reactivate
                      </Button>
                    ) : null}
                    {user.role === "staff" ? (
                      <Button size="sm" variant="soft" onClick={() => open(user, "department")}>
                        Department
                      </Button>
                    ) : null}
                    {isSuper ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => open(user, "role")} disabled={protectedAdmin}>
                          <ShieldCheck className="h-3.5 w-3.5" /> Role
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => open(user, "reset_password")} disabled={protectedAdmin}>
                          <KeyRound className="h-3.5 w-3.5" /> Password
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${actionTitle(action)} · ${selected.full_name}` : "Manage user"}
        description={
          selected
            ? `${selected.email} · ${ROLE_LABEL[selected.role] ?? selected.role} · ${selected.status}`
            : undefined
        }
      >
        <form onSubmit={submit} className="space-y-4">
          {action === "role" ? (
            <div>
              <Label htmlFor="user-role">New role</Label>
              <Select id="user-role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
                {Object.entries(ROLE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-[11px] leading-5 text-ink-400">
                Changing a role signs the user out of existing sessions. Administrator roles should be granted
                sparingly and reviewed regularly.
              </p>
            </div>
          ) : null}

          {action === "department" ? (
            <div>
              <Label htmlFor="user-department">Department</Label>
              <Select
                id="user-department"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
              >
                <option value="">No department assigned</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {action === "reset_password" ? (
            <div>
              <Label htmlFor="user-password">New temporary password</Label>
              <Input
                id="user-password"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
              <p className="mt-1 text-[11px] leading-5 text-ink-400">
                Share it securely. The user will be signed out of all current sessions.
              </p>
            </div>
          ) : null}

          {["approve", "reject", "suspend", "reactivate"].includes(action) ? (
            <p className="rounded-xl bg-ink-50 p-3 text-xs leading-5 text-ink-500 dark:bg-white/5 dark:text-ink-300">
              {action === "approve"
                ? "Approving activates this staff account. Staff cannot self-approve registrations."
                : action === "reject"
                  ? "Rejecting marks the pending account as deleted. The user will not be able to sign in."
                  : action === "suspend"
                    ? "Suspending immediately ends active sessions and blocks sign-in until reactivated."
                    : "Reactivating restores sign-in access for this account."}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              variant={action === "reject" || action === "suspend" ? "danger" : "primary"}
            >
              Confirm {actionTitle(action).toLowerCase()}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function actionTitle(action: UserAction) {
  const labels: Record<UserAction, string> = {
    approve: "Approve account",
    reject: "Reject account",
    suspend: "Suspend account",
    reactivate: "Reactivate account",
    role: "Change role",
    department: "Assign department",
    reset_password: "Reset password",
  };
  return labels[action];
}
