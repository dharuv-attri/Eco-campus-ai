import Link from "next/link";
import { Award, Crown, Medal, Trophy } from "lucide-react";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { cn, formatNumber } from "@/lib/utils";
import type { LeaderboardRow } from "@/lib/analytics";

export function LeaderboardView({
  rows,
  departments,
  period,
  basePath,
  highlightUserId,
}: {
  rows: LeaderboardRow[];
  departments: Array<{ department: string; points: number; members: number }>;
  period: "week" | "month" | "all";
  basePath: string;
  highlightUserId?: string;
}) {
  const periods: Array<{ value: "week" | "month" | "all"; label: string }> = [
    { value: "week", label: "This week" },
    { value: "month", label: "This month" },
    { value: "all", label: "All time" },
  ];
  const top = rows.slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="surface flex flex-wrap gap-2 p-2">
        {periods.map((item) => (
          <Link
            key={item.value}
            href={item.value === "all" ? basePath : `${basePath}?period=${item.value}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              period === item.value
                ? "bg-forest-800 text-white dark:bg-emerald-600"
                : "text-ink-500 hover:bg-ink-100 dark:hover:bg-white/5",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {top.length ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {top.map((row, index) => (
            <div
              key={row.user_id}
              className={cn(
                "surface relative overflow-hidden p-5",
                index === 0 && "border-amber-500/30 bg-amber-500/[0.04]",
                highlightUserId === row.user_id && "ring-2 ring-emerald-500/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    index === 0
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : index === 1
                        ? "bg-ink-300/20 text-ink-600 dark:text-ink-300"
                        : "bg-orange-500/10 text-orange-700 dark:text-orange-300",
                  )}
                >
                  {index === 0 ? <Crown className="h-5 w-5" /> : <Medal className="h-5 w-5" />}
                </span>
                <span className="font-display text-2xl font-semibold text-ink-300 dark:text-ink-600">
                  #{row.rank}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Avatar name={row.full_name} src={row.profile_image} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {row.full_name}
                    {row.is_demo ? <DemoBadge /> : null}
                  </p>
                  <p className="truncate text-[11px] text-ink-500">{row.department || "Student"}</p>
                </div>
              </div>
              <p className="mt-4 font-display text-2xl font-semibold text-emerald-800 dark:text-emerald-300">
                {formatNumber(row.points)} <span className="text-xs font-medium text-ink-400">points</span>
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="surface overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-ink-50/70 px-4 py-3 dark:bg-white/[0.03]">
          <Trophy className="h-4 w-4 text-emerald-600" />
          <h2 className="font-display text-sm font-semibold">Student rankings</h2>
          <span className="ml-auto text-[10px] text-ink-400">{periods.find((item) => item.value === period)?.label}</span>
        </div>
        {rows.length ? (
          <ul className="divide-y">
            {rows.map((row) => (
              <li
                key={row.user_id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  highlightUserId === row.user_id && "bg-emerald-500/[0.055]",
                )}
              >
                <span className="w-8 shrink-0 text-center font-display text-sm font-semibold text-ink-400">
                  {row.rank}
                </span>
                <Avatar name={row.full_name} src={row.profile_image} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-xs font-semibold">
                    {row.full_name}
                    {row.is_demo ? <DemoBadge /> : null}
                    {highlightUserId === row.user_id ? <Badge tone="emerald">You</Badge> : null}
                  </p>
                  <p className="truncate text-[10px] text-ink-500">{row.department || "Student"}</p>
                </div>
                <span className="shrink-0 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {formatNumber(row.points)} pts
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5">
            <EmptyState
              icon={Award}
              title="No points in this period"
              description="Verified reports, quizzes and green activities earn points. Check another period."
            />
          </div>
        )}
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b bg-ink-50/70 px-4 py-3 dark:bg-white/[0.03]">
          <h2 className="font-display text-sm font-semibold">Department standings</h2>
        </div>
        {departments.length ? (
          <ul className="divide-y">
            {departments.map((row, index) => (
              <li key={row.department} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-center text-xs font-semibold text-ink-400">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{row.department}</span>
                <span className="text-[10px] text-ink-400">{row.members} members</span>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {formatNumber(row.points)} pts
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-xs text-ink-500">Department standings appear once students earn points.</p>
        )}
      </div>

      <p className="text-[11px] leading-5 text-ink-400">
        Points are awarded only for verified reports, completed quizzes and administrator-verified green
        activities. Demo accounts are labelled and never presented as real participants.
      </p>
    </div>
  );
}
