import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComplaintDetailView } from "@/components/complaints/complaint-detail";
import { StaffActions, StaffReadOnlyNotice } from "@/components/complaints/staff-actions";
import { ReporterActions } from "@/components/complaints/reporter-actions";
import { canAccessComplaint, canManageComplaint, requireRole } from "@/lib/auth";
import { getComplaint } from "@/lib/complaints";

export const metadata: Metadata = { title: "Assigned report" };

export default async function StaffTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["staff"], "/staff/tasks");
  const { id } = await params;
  const complaint = getComplaint(id);
  if (!complaint || !canAccessComplaint(user, complaint)) notFound();

  const canManage = complaint.status !== "archived" && canManageComplaint(user, complaint);
  const isReporter = complaint.reporter_id === user.id;

  return (
    <ComplaintDetailView
      complaint={complaint}
      backHref="/staff/tasks"
      backLabel="Back to assigned work"
      actions={
        <>
          {canManage ? <StaffActions complaintId={complaint.id} status={complaint.status} /> : <StaffReadOnlyNotice status={complaint.status} />}
          {isReporter ? (
            <ReporterActions
              complaintId={complaint.id}
              status={complaint.status}
              hasFeedback={Boolean(complaint.feedback)}
              canReopen={["resolved", "verified", "closed"].includes(complaint.status)}
            />
          ) : null}
        </>
      }
    />
  );
}
