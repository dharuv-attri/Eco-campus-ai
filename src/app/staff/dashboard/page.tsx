import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  PlusCircle,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, StatCard } from "@/components/ui/misc";
import { getStaffStats } from "@/lib/analytics";
import { countComplaints, listComplaints } from "@/lib/complaints";
import { all } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { formatNumber, timeAgo } from "@/lib/utils";
import type { Notification } from "@/types";

export const metadata: Metadata = { title: "Staff dashboard" };

export default async function StaffDashboard() {
  const user = await requireRole(["staff"], "/staff/dashboard");
  const access = { userId: user.id, departmentId: user.departmentId };
  const [stats, assigned, myReports, notifications, directAssignments] = await Promise.all([
    getStaffStats(user),
    listComplaints({ staffAccess: access, excludeArchived: true, limit: 5 }),
    listComplaints({ reporterId: user.id, limit: 3 }),
    all<Notification>(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
      user.id,
    ),
    countComplaints({ staffId: user.id }),
  ]);
  const openAssigned = assigned.filter(
    (item) => !["resolved", "verified", "closed", "rejected"].includes(item.status),
  );

  return (
    <>
      <PageHeader
        eyebrow="Staff workspace"
        title={`${user.department || "Campus"} work queue`}
        description="Review environmental reports assigned to you or your department, record progress and close the loop with the reporter."
        action={
          <LinkButton href="/staff/reports/new">
            <PlusCircle className="h-4 w-4" /> Report a problem
          </LinkButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned work" value={formatNumber(stats.total)} hint="Your department and direct assignments" icon={ClipboardList} tone="forest" />
        <StatCard label="Awaiting start" value={formatNumber(stats.assigned)} hint="Assigned but not started" icon={Wrench} tone="amber" />
        <StatCard label="In progress" value={formatNumber(stats.inProgress)} hint="Active work" icon={FileSearch} tone="sky" />
        <StatCard label="Resolved" value={formatNumber(stats.resolved)} hint="Completed and verified" icon={CheckCircle2} />
      </div>

      {stats.highPriority > 0 ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {stats.highPriority} high-priority or emergency report{stats.highPriority === 1 ? "" : "s"} in your queue.
            Review these first and keep people away from any hazard.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Current work</h2>
            <Link href="/staff/tasks" className="inline-flex items-center gap-1 text-xs font-semibold text-forest-800 hover:underline dark:text-emerald-300">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {assigned.length ? (
            <div className="space-y-3">
              {assigned.map((complaint) => (
                <ComplaintCard key={complaint.id} complaint={complaint} href={`/staff/tasks/${complaint.id}`} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Wrench}
              title="No work assigned yet"
              description="When an administrator assigns an environmental report to your department, it will appear here with full details."
              action={
                <LinkButton href="/staff/tasks" variant="outline">
                  Open work queue
                </LinkButton>
              }
            />
          )}

          {openAssigned.length === 0 && assigned.length > 0 ? (
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-xs text-emerald-800 dark:text-emerald-200">
              Your current assignments are resolved or closed. Administrators will verify completed work.
            </p>
          ) : null}

          <div className="surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold">Reports you filed</h2>
              <Link href="/staff/reports" className="text-[11px] font-semibold text-forest-800 hover:underline dark:text-emerald-300">
                View all
              </Link>
            </div>
            {myReports.length ? (
              <ul className="mt-3 divide-y">
                {myReports.map((report) => (
                  <li key={report.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link href={`/staff/reports/${report.id}`} className="block truncate text-xs font-semibold hover:underline">
                        {report.title}
                      </Link>
                      <p className="text-[10px] text-ink-400">
                        {report.complaint_code} · {timeAgo(report.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] capitalize text-ink-500">{report.status.replaceAll("_", " ")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-ink-500">
                You can report problems as a campus member too. Use “Report a problem” above.
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold">Notifications</h2>
              <Link href="/staff/notifications" className="text-[11px] font-semibold text-forest-800 hover:underline dark:text-emerald-300">
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
              <p className="mt-3 text-xs text-ink-500">No notifications yet. Assignment and status updates appear here.</p>
            )}
          </div>

          <div className="surface p-5">
            <h2 className="font-display text-base font-semibold">Your scope</h2>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Department</dt>
                <dd className="text-right font-medium">{user.department || "Not assigned"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Direct assignments</dt>
                <dd className="text-right font-medium">{formatNumber(directAssignments)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Role</dt>
                <dd className="text-right font-medium">Staff</dd>
              </div>
            </dl>
            <p className="mt-3 text-[10px] leading-4 text-ink-400">
              You can update reports assigned directly to you or to your department. Other reports remain read-only.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-forest-900 to-forest-800 p-5 text-white">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              <Wrench className="h-3 w-3" /> Resolution standard
            </p>
            <p className="mt-2 text-sm font-medium leading-6">
              Add clear resolution notes and, where possible, a photo of the completed work. Administrators use this
              evidence to verify and award green points.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
