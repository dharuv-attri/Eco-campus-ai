import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComplaintDetailView } from "@/components/complaints/complaint-detail";
import { AdminComplaintActions } from "@/components/admin/complaint-actions";
import { requireRole } from "@/lib/auth";
import { getComplaint } from "@/lib/complaints";
import { all } from "@/lib/db";

export const metadata: Metadata = { title: "Complaint details" };

export default async function AdminComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "super_admin"], "/admin/complaints");
  const { id } = await params;
  const complaint = getComplaint(id);
  if (!complaint) notFound();

  const departments = all<{ id: string; name: string }>("SELECT id, name FROM departments ORDER BY name ASC");
  const staff = all<{ id: string; full_name: string; department_id: string | null }>(
    "SELECT id, full_name, department_id FROM users WHERE role = 'staff' AND status = 'active' ORDER BY full_name ASC",
  );

  return (
    <ComplaintDetailView
      complaint={complaint}
      backHref="/admin/complaints"
      backLabel="Back to complaints"
      actions={
        <AdminComplaintActions
          complaintId={complaint.id}
          status={complaint.status}
          priority={complaint.priority}
          departmentId={complaint.assigned_department_id}
          staffId={complaint.assigned_staff_id}
          isDemo={complaint.is_demo === 1}
          departments={departments}
          staff={staff}
        />
      }
    />
  );
}
