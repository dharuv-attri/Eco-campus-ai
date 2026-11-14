import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/portal-shell";
import { ActivityManager } from "@/components/admin/activity-manager";
import { requireRole } from "@/lib/auth";
import { all } from "@/lib/db";

export const metadata: Metadata = { title: "Green activities" };

export default async function AdminActivitiesPage() {
  await requireRole(["admin", "super_admin"], "/admin/activities");
  const activities = await all<{
    id: string;
    title: string;
    description: string | null;
    points: number;
    activity_date: string | null;
    verified: number;
    is_demo: number;
    created_at: string;
    awarded: number;
  }>(
    `SELECT ga.*,
       (SELECT COUNT(*) FROM leaderboard_points lp WHERE lp.activity_id = ga.id) AS awarded
     FROM green_activities ga
     ORDER BY ga.created_at DESC`,
  );
  const students = await all<{ id: string; full_name: string; email: string; department: string | null }>(
    "SELECT id, full_name, email, department FROM users WHERE role = 'student' AND status = 'active' ORDER BY full_name ASC",
  );

  return (
    <>
      <PageHeader
        eyebrow="Recognition"
        title="Verified green activities"
        description="Record clean-up drives, plantation days, awareness sessions and other activities. Points are awarded once per selected student and never auto-granted."
      />
      <p className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 text-[11px] leading-5 text-emerald-900/80 dark:text-emerald-200/80">
        Select only students who genuinely participated. Deleting an activity also removes the points it awarded, so
        correct mistakes promptly and transparently.
      </p>
      <ActivityManager activities={activities} students={students} />
    </>
  );
}
