import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  ClipboardList,
  FileSearch,
  Leaf,
  MapPin,
  PlusCircle,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState, StatCard } from "@/components/ui/misc";
import { getUserRank, getStudentStats } from "@/lib/analytics";
import { listComplaints } from "@/lib/complaints";
import { all, one } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatNumber, timeAgo } from "@/lib/utils";
import type { Notification } from "@/types";

export const metadata: Metadata = { title: "Student dashboard" };

export default async function StudentDashboard() {
  const user = await requireRole(["student"], "/student/dashboard");

  // Every read is independent, so run them concurrently instead of stacking
  // eight sequential round-trips to the database.
  const [settings, stats, recentReports, notifications, rank, pointsHistory, latestResolved] =
    await Promise.all([
      getSettings(),
      getStudentStats(user.id),
      listComplaints({ reporterId: user.id, limit: 6 }),
      all<Notification>(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 4",
        user.id,
      ),
      getUserRank(user.id),
      all<{ id: string; points: number; reason: string; created_at: string }>(
        "SELECT id, points, reason, created_at FROM leaderboard_points WHERE user_id = ? ORDER BY created_at DESC LIMIT 3",
        user.id,
      ),
      one<{ id: string; complaint_code: string; title: string; rating: number | null }>(
        `SELECT c.id, c.complaint_code, c.title, f.rating
         FROM complaints c LEFT JOIN complaint_feedback f ON f.complaint_id = c.id
         WHERE c.reporter_id = ? AND c.status IN ('resolved','verified','closed')
         ORDER BY COALESCE(c.resolved_at, c.updated_at) DESC LIMIT 1`,
        user.id,
      ),
    ]);
  const recent = recentReports.slice(0, 3);
  const openReports = recentReports
    .filter((item) => !["closed", "rejected", "verified"].includes(item.status))
    .slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="Student workspace"
        title={`Hello, ${user.fullName.split(" ")[0]}.`}
        description="Track your environmental reports, earn green points and help make the campus more sustainable."
        action={
          <LinkButton href="/student/reports/new">
            <PlusCircle className="h-4 w-4" /> Report a problem
          </LinkButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My reports" value={formatNumber(stats.total)} hint="All time" icon={ClipboardList} tone="forest" />
        <StatCard label="Open" value={formatNumber(stats.open)} hint="Awaiting resolution" icon={FileSearch} tone="amber" />
        <StatCard label="Resolved" value={formatNumber(stats.resolved)} hint="Verified or closed" icon={BadgeCheck} />
        <StatCard
          label="Green points"
          value={formatNumber(stats.points)}
          hint={rank ? `Rank #${rank} on the leaderboard` : "Earn points for verified reports"}
          icon={Trophy}
          tone="violet"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Recent reports</h2>
            <Link href="/student/reports" className="inline-flex items-center gap-1 text-xs font-semibold text-forest-800 hover:underline dark:text-emerald-300">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recent.length ? (
            <div className="space-y-3">
              {recent.map((complaint) => (
                <ComplaintCard key={complaint.id} complaint={complaint} href={`/student/reports/${complaint.id}`} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Leaf}
              title="Your first report starts here"
              description="Notice a leaking tap, wasted electricity or an overflowing bin? Report it with a photo and precise location."
              action={
                <LinkButton href="/student/reports/new">
                  <PlusCircle className="h-4 w-4" /> Report a problem
                </LinkButton>
              }
            />
          )}

          {openReports.length === 0 && recent.length > 0 ? (
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-xs text-emerald-800 dark:text-emerald-200">
              All your recent reports are resolved. If an issue has returned, open the report and use “Reopen
              report”.
            </p>
          ) : null}

          {latestResolved ? (
            <div className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Resolution feedback</p>
                <p className="mt-1 text-sm font-medium">{latestResolved.title}</p>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  {latestResolved.rating ? `You rated this ${latestResolved.rating}/5.` : "Tell us how the resolution went."}
                </p>
              </div>
              <LinkButton href={`/student/reports/${latestResolved.id}`} variant="outline" size="sm">
                {latestResolved.rating ? <Star className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                {latestResolved.rating ? "View report" : "Rate resolution"}
              </LinkButton>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold">Notifications</h2>
              <Link href="/student/notifications" className="text-[11px] font-semibold text-forest-800 hover:underline dark:text-emerald-300">
                View all
              </Link>
            </div>
            {notifications.length ? (
              <ul className="mt-3 space-y-2.5">
                {notifications.map((item) => (
                  <li key={item.id} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <Bell className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{item.title}</p>
                      <p className="line-clamp-2 text-[10px] leading-4 text-ink-500">{item.message}</p>
                      <p className="text-[9px] text-ink-400">{timeAgo(item.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-ink-500">No notifications yet. Status updates will appear here.</p>
            )}
          </div>

          <div className="surface p-5">
            <h2 className="font-display text-base font-semibold">Green points history</h2>
            {pointsHistory.length ? (
              <ul className="mt-3 space-y-2">
                {pointsHistory.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.reason}</span>
                      <span className="text-[10px] text-ink-400">{timeAgo(item.created_at)}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                      +{item.points}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs leading-5 text-ink-500">
                Points appear here after a report is verified or you complete a green activity.
              </p>
            )}
            <LinkButton href="/student/green-actions" variant="soft" size="sm" className="mt-4 w-full">
              <Sparkles className="h-3.5 w-3.5" /> Earn more points
            </LinkButton>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-forest-900 to-forest-800 p-5 text-white">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              <MapPin className="h-3 w-3" /> Reporting tip
            </p>
            <p className="mt-2 text-sm font-medium leading-6">
              A precise location and a clear photo help the team resolve issues faster.
            </p>
            <LinkButton href="/campus-map" variant="secondary" size="sm" className="mt-4">
              Explore campus map
            </LinkButton>
          </div>

          {stats.unread ? (
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-[11px] text-amber-800 dark:text-amber-200">
              You have {stats.unread} unread notification{stats.unread === 1 ? "" : "s"}.
            </p>
          ) : null}

          <p className="px-1 text-[10px] leading-4 text-ink-400">
            {settings.site_name} is an independent platform. {settings.footer_text}
          </p>
        </aside>
      </div>
    </>
  );
}
