import type { Metadata } from "next";
import { Award, Crown, Star, Trophy } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { LeaderboardView } from "@/components/portal/leaderboard-view";
import { StatCard } from "@/components/ui/misc";
import { getDepartmentLeaderboard, getLeaderboard, getUserPoints } from "@/lib/analytics";
import { requireRole } from "@/lib/auth";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Green leaderboard" };

export default async function StudentLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole(["student"], "/student/leaderboard");
  const params = await searchParams;
  const raw = typeof params.period === "string" ? params.period : "all";
  const period: "week" | "month" | "all" = raw === "week" || raw === "month" ? raw : "all";

  const rows = getLeaderboard(period, 50);
  const departments = getDepartmentLeaderboard();
  const myRow = getLeaderboard("all", 500).find((row) => row.user_id === user.id);
  const points = getUserPoints(user.id);
  const myDepartment = departments.find((row) => row.department === (user.department || "Unassigned"));

  return (
    <>
      <PageHeader
        eyebrow="Recognition"
        title="Green leaderboard"
        description="Celebrate students whose verified reports, quizzes and green activities make the campus more sustainable."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Your green points"
          value={formatNumber(points)}
          hint="Verified reports, quizzes and activities"
          icon={Star}
          tone="emerald"
        />
        <StatCard
          label="All-time rank"
          value={myRow ? `#${myRow.rank}` : "—"}
          hint={myRow ? "Based on all-time verified points" : "Rank appears after you earn points"}
          icon={Trophy}
          tone="amber"
        />
        <StatCard
          label="Department standing"
          value={myDepartment ? `#${departments.findIndex((row) => row.department === myDepartment.department) + 1}` : "—"}
          hint={myDepartment ? `${formatNumber(myDepartment.points)} points across ${myDepartment.members} members` : "No department points yet"}
          icon={Crown}
          tone="violet"
        />
      </div>

      <LeaderboardView
        rows={rows}
        departments={departments}
        period={period}
        basePath="/student/leaderboard"
        highlightUserId={user.id}
      />

      <div className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-[11px] leading-5 text-emerald-900/80 dark:text-emerald-200/80">
        <Award className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Points are never awarded for submitting a report alone. A report earns 20 points once an administrator
          verifies the completed work. Quizzes and green activities follow the same verified-only rule.
        </p>
      </div>
    </>
  );
}
