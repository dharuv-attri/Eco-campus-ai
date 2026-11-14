import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/portal-shell";
import { ReportForm } from "@/components/forms/report-form";
import { requireRole } from "@/lib/auth";
import { listCampusLocations } from "@/lib/content";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Report a problem" };

export default async function StudentNewReportPage() {
  const user = await requireRole(["student"], "/student/reports/new");
  const settings = await getSettings();
  const locations = await listCampusLocations();

  return (
    <>
      <PageHeader
        eyebrow="New report"
        title="Report an environmental problem"
        description="Be specific, choose the closest location and attach a clear photo. You will receive a tracking code immediately."
      />
      <ReportForm
        user={user}
        locations={locations}
        anonymousEnabled={settings.anonymous_reporting_enabled !== "false"}
        detailBase="/student/reports"
      />
    </>
  );
}
