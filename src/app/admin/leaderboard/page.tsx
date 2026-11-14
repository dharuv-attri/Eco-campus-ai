import type { Metadata } from "next";
import { Award, Medal, Users } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { LeaderboardView } from "@/components/portal/leaderboard-view";
import { StatCard } from "@/components/ui/misc";
import { getDepartmentLeaderboard, getLeaderboard } from "@/lib/analytics";
import { requireRole } from "@/lib/auth";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function AdminLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["admin", "super_admin"], "/admin/leaderboard");
  const params = await searchParams;
  const raw = typeof params.period === "string" ? params.period : "all";
  const period: "week" | "month" | "all" = raw === "week" || raw === "month" ? raw : "all";

  const rows = await getLeaderboard(period, 100);
  const departments = await getDepartmentLeaderboard();
  const totalPoints = rows.reduce((sum, row) => sum + row.points, 0);

  return (
    <>
      <PageHeader
        eyebrow="Recognition"
        title="Green points leaderboard"
        description="Transparent standings based only on verified reports, completed quizzes and administrator-verified activities."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Ranked students" value={formatNumber(rows.length)} hint="With at least one point in this period" icon={Users} tone="violet" />
        <StatCard label="Points in period" value={formatNumber(totalPoints)} hint="Verified activity only" icon={Award} tone="emerald" />
        <StatCard label="Top department" value={departments[0]?.department ?? "—"} hint={departments[0] ? `${formatNumber(departments[0].points)} points` : "No department points yet"} icon={Medal} tone="amber" />
      </div>

      <LeaderboardView rows={rows} departments={departments} period={period} basePath="/admin/leaderboard" />

      <p className="mt-5 text-[11px] leading-5 text-ink-400">
        To correct a points error, delete the incorrect green activity or adjust the underlying report verification
        through the complaint record. Every change is recorded in the audit log.
      </p>
    </>
  );
}
