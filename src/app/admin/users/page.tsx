import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/portal-shell";
import { UserManager } from "@/components/admin/user-manager";
import { requireRole } from "@/lib/auth";
import { all } from "@/lib/db";
import type { PublicUser } from "@/types";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const actor = await requireRole(["admin", "super_admin"], "/admin/users");
  const users = all<PublicUser>(
    `SELECT u.*, (SELECT COUNT(*) FROM complaints c WHERE c.reporter_id = u.id) AS complaint_count
     FROM users u
     ORDER BY CASE u.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, u.created_at DESC`,
  );
  const departments = all<{ id: string; name: string }>("SELECT id, name FROM departments ORDER BY name ASC");
  const pending = users.filter((person) => person.status === "pending").length;

  return (
    <>
      <PageHeader
        eyebrow="People & access"
        title="User management"
        description="Approve staff registrations, assign departments, suspend accounts and manage roles. Administrator roles are restricted to super administrators."
      />
      {pending ? (
        <p className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs text-amber-800 dark:text-amber-200">
          {pending} account{pending === 1 ? "" : "s"} awaiting approval. Pending staff cannot sign in until approved.
        </p>
      ) : null}
      <UserManager users={users} departments={departments} actorRole={actor.role} actorId={actor.id} />
    </>
  );
}
