import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardList,
  FileWarning,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { CategoryBarChart, MonthlyTrendChart, StatusPieChart } from "@/components/charts/charts";
import { StatusBadge, DemoBadge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/misc";
import {
  getAdminStats,
  getCategoryBreakdown,
  getMonthlyTrend,
  getStatusBreakdown,
} from "@/lib/analytics";
import { listComplaints } from "@/lib/complaints";
import { all } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { categoryLabel, formatNumber, statusMeta, timeAgo } from "@/lib/utils";
import type { PublicUser } from "@/types";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboardPage() {
  const user = await requireRole(["admin", "super_admin"], "/admin/dashboard");
  const [stats, statusBreakdown, categoryBreakdown, monthlyTrend, recent, pendingStaff, audit] =
    await Promise.all([
      getAdminStats(),
      getStatusBreakdown(),
      getCategoryBreakdown(),
      getMonthlyTrend(),
      listComplaints({ limit: 6 }),
      all<PublicUser>(
        "SELECT * FROM users WHERE role = 'staff' AND status = 'pending' ORDER BY created_at DESC LIMIT 5",
      ),
      all<{
        id: string;
        actor_name: string | null;
        action: string;
        entity_type: string | null;
        created_at: string;
      }>("SELECT id, actor_name, action, entity_type, created_at FROM admin_audit_logs ORDER BY created_at DESC LIMIT 6"),
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title={`Welcome, ${user.fullName.split(" ")[0]}.`}
        description="Campus-wide environmental operations, content, users and platform health in one place."
        action={
          <Link
            href="/admin/complaints"
            className="inline-flex items-center gap-1.5 rounded-xl bg-forest-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-forest-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            Manage complaints <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {stats.users.pendingStaff > 0 ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {stats.users.pendingStaff} staff registration{stats.users.pendingStaff === 1 ? " is" : "s are"} awaiting
              approval. Staff accounts cannot sign in until an administrator approves them.
            </p>
          </div>
          <Link href="/admin/users" className="shrink-0 text-xs font-semibold text-amber-900 underline dark:text-amber-200">
            Review accounts
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total reports" value={formatNumber(stats.complaints.total)} hint={`${formatNumber(stats.complaints.demo)} demo records`} icon={ClipboardList} tone="forest" />
        <StatCard label="Awaiting review" value={formatNumber(stats.complaints.pending)} hint="Submitted or under review" icon={FileWarning} tone="amber" />
        <StatCard label="Active work" value={formatNumber(stats.complaints.assigned + stats.complaints.inProgress + stats.complaints.reopened)} hint="Assigned, in progress or reopened" icon={Building2} tone="sky" />
        <StatCard label="Verified / closed" value={formatNumber(stats.complaints.verified + stats.complaints.closed)} hint="Completed and confirmed" icon={BadgeCheck} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered users" value={formatNumber(stats.users.total)} hint={`${formatNumber(stats.users.students)} students · ${formatNumber(stats.users.staff)} staff`} icon={Users} tone="violet" />
        <StatCard
          label="Avg. resolution time"
          value={stats.complaints.avgResolutionHours ? `${Math.round(stats.complaints.avgResolutionHours)}h` : "—"}
          hint="From submission to resolved"
          icon={ShieldCheck}
        />
        <StatCard label="Rejected" value={formatNumber(stats.complaints.rejected)} hint="Declined with a reason" icon={FileWarning} tone="rose" />
        <StatCard label="Reopened" value={formatNumber(stats.complaints.reopened)} hint="Reported again after resolution" icon={AlertTriangle} tone="amber" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="font-display text-base font-semibold">Reports over time</h2>
          <p className="mt-1 text-[11px] text-ink-400">Monthly submissions and resolutions (last six months)</p>
          <div className="mt-3">
            <MonthlyTrendChart data={monthlyTrend} />
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="font-display text-base font-semibold">Status distribution</h2>
          <p className="mt-1 text-[11px] text-ink-400">Every report by current lifecycle status</p>
          <div className="mt-3">
            <StatusPieChart data={statusBreakdown.map((row) => ({ name: statusMeta(row.status).label, value: row.count }))} />
          </div>
        </section>

        <section className="surface p-5 lg:col-span-2">
          <h2 className="font-display text-base font-semibold">Reports by category</h2>
          <p className="mt-1 text-[11px] text-ink-400">Where environmental issues are concentrated</p>
          <div className="mt-3">
            <CategoryBarChart data={categoryBreakdown.map((row) => ({ name: categoryLabel(row.category), value: row.count }))} />
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="surface overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b bg-ink-50/70 px-4 py-3 dark:bg-white/[0.03]">
            <h2 className="font-display text-sm font-semibold">Latest reports</h2>
            <Link href="/admin/complaints" className="text-[10px] font-semibold text-forest-800 hover:underline dark:text-emerald-300">
              View all
            </Link>
          </div>
          {recent.length ? (
            <ul className="divide-y">
              {recent.map((complaint) => (
                <li key={complaint.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link href={`/admin/complaints/${complaint.id}`} className="truncate text-xs font-semibold hover:underline">
                        {complaint.title}
                      </Link>
                      {complaint.is_demo ? <DemoBadge /> : null}
                    </div>
                    <p className="mt-0.5 text-[10px] text-ink-400">
                      {complaint.complaint_code} · {categoryLabel(complaint.category)} · {timeAgo(complaint.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={complaint.status} />
                    <span className="text-[10px] capitalize text-ink-400">{complaint.priority}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-xs text-ink-500">No reports yet.</p>
          )}
        </section>

        <aside className="space-y-4">
          <div className="surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold">Pending staff</h2>
              <Link href="/admin/users" className="text-[10px] font-semibold text-forest-800 hover:underline dark:text-emerald-300">
                Manage
              </Link>
            </div>
            {pendingStaff.length ? (
              <ul className="mt-3 space-y-2.5">
                {pendingStaff.map((person) => (
                  <li key={person.id}>
                    <p className="truncate text-xs font-semibold">{person.full_name}</p>
                    <p className="truncate text-[10px] text-ink-400">
                      {person.email} · {person.department || "No department"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-ink-500">No staff accounts awaiting approval.</p>
            )}
          </div>

          <div className="surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold">Recent admin activity</h2>
              <Link href="/admin/audit" className="text-[10px] font-semibold text-forest-800 hover:underline dark:text-emerald-300">
                Audit log
              </Link>
            </div>
            {audit.length ? (
              <ul className="mt-3 space-y-2.5">
                {audit.map((entry) => (
                  <li key={entry.id}>
                    <p className="truncate text-[11px] font-medium">{entry.action}</p>
                    <p className="truncate text-[10px] text-ink-400">
                      {entry.actor_name || "System"} · {timeAgo(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-ink-500">No administrator actions recorded yet.</p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
