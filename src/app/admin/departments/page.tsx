import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/portal-shell";
import { DepartmentManager } from "@/components/admin/department-manager";
import { requireRole } from "@/lib/auth";
import { all } from "@/lib/db";
import type { Department } from "@/types";

export const metadata: Metadata = { title: "Departments" };

export default async function AdminDepartmentsPage() {
  await requireRole(["admin", "super_admin"], "/admin/departments");
  const departments = all<Department & { staff_count: number; open_count: number }>(
    `SELECT d.*,
       (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.role = 'staff' AND u.status = 'active') AS staff_count,
       (SELECT COUNT(*) FROM complaints c WHERE c.assigned_department_id = d.id AND c.status NOT IN ('closed','rejected','verified')) AS open_count
     FROM departments d
     ORDER BY d.name ASC`,
  );

  return (
    <>
      <PageHeader
        eyebrow="Campus operations"
        title="Departments"
        description="Configure teams that receive environmental reports. Each department handles specific problem categories and receives assignment notifications."
      />
      <p className="mb-4 text-[11px] leading-5 text-ink-500 dark:text-ink-300">
        Deleting a department is blocked while it has open reports. Reassign those reports first so no work is lost.
      </p>
      <DepartmentManager departments={departments} />
    </>
  );
}
