import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComplaintDetailView } from "@/components/complaints/complaint-detail";
import { ReporterActions } from "@/components/complaints/reporter-actions";
import { requireRole } from "@/lib/auth";
import { getComplaint } from "@/lib/complaints";

export const metadata: Metadata = { title: "Report details" };

export default async function StaffReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["staff"], "/staff/reports");
  const { id } = await params;
  const complaint = getComplaint(id);
  if (!complaint || complaint.reporter_id !== user.id) notFound();

  return (
    <ComplaintDetailView
      complaint={complaint}
      backHref="/staff/reports"
      backLabel="Back to my reports"
      actions={
        <ReporterActions
          complaintId={complaint.id}
          status={complaint.status}
          hasFeedback={Boolean(complaint.feedback)}
          canReopen={["resolved", "verified", "closed"].includes(complaint.status)}
        />
      }
    />
  );
}
