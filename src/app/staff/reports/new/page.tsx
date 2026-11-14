import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/portal-shell";
import { ReportForm } from "@/components/forms/report-form";
import { requireRole } from "@/lib/auth";
import { listCampusLocations } from "@/lib/content";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Report a problem" };

export default async function StaffNewReportPage() {
  const user = await requireRole(["staff"], "/staff/reports/new");
  const settings = await getSettings();
  const locations = await listCampusLocations();

  return (
    <>
      <PageHeader
        eyebrow="New report"
        title="Report an environmental problem"
        description="As a staff member you can report campus issues too. Photos and precise locations help the responsible team respond faster."
      />
      <ReportForm
        user={user}
        locations={locations}
        anonymousEnabled={settings.anonymous_reporting_enabled !== "false"}
        detailBase="/staff/reports"
      />
    </>
  );
}
