import type { Metadata } from "next";
import { BarChart3, ClipboardList, Clock, Download, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { ExportButtons } from "@/components/portal/export-buttons";
import { CategoryBarChart, DepartmentBarChart, MonthlyTrendChart, StatusPieChart } from "@/components/charts/charts";
import { StatCard } from "@/components/ui/misc";
import {
  getAdminStats,
  getCategoryBreakdown,
  getDepartmentBreakdown,
  getMonthlyTrend,
  getResolutionPerformance,
  getStatusBreakdown,
} from "@/lib/analytics";
import { countComplaints, listComplaints } from "@/lib/complaints";
import { requireRole } from "@/lib/auth";
import { categoryLabel, formatDateTime, formatNumber, statusMeta } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports & exports" };

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["admin", "super_admin"], "/admin/reports");
  const params = await searchParams;
  const get = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : "";
  };
  const from = get("from");
  const to = get("to");
  const rangeFilters = {
    from: from ? `${from}T00:00:00.000Z` : undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
  };

  const stats = getAdminStats();
  const statusBreakdown = getStatusBreakdown();
  const categoryBreakdown = getCategoryBreakdown();
  const departmentBreakdown = getDepartmentBreakdown();
  const monthlyTrend = getMonthlyTrend();
  const performance = getResolutionPerformance();

  const filtered = listComplaints({ ...rangeFilters, limit: 200 });
  const filteredCount = countComplaints(rangeFilters);
  const rows = filtered.map((complaint) => ({
    code: complaint.complaint_code,
    title: complaint.title,
    category: categoryLabel(complaint.category),
    status: statusMeta(complaint.status).label,
    priority: complaint.priority,
    department: complaint.department_name || "Unassigned",
    staff: complaint.staff_name || "Unassigned",
    reporter: complaint.reporter_name || "Campus member",
    location: [complaint.building, complaint.floor, complaint.room_number, complaint.specific_location]
      .filter(Boolean)
      .join(" · "),
    created: formatDateTime(complaint.created_at),
    resolved: complaint.resolved_at ? formatDateTime(complaint.resolved_at) : "",
  }));

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Reports & exports"
        description="Understand complaint volumes, category hotspots and department performance. Export filtered records for internal review."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total complaints" value={formatNumber(stats.complaints.total)} hint={`${formatNumber(stats.complaints.demo)} demo records`} icon={ClipboardList} tone="forest" />
        <StatCard
          label="Resolution rate"
          value={`${stats.complaints.total ? Math.round(((stats.complaints.verified + stats.complaints.closed) / stats.complaints.total) * 100) : 0}%`}
          hint="Verified or closed"
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          label="Average resolution"
          value={stats.complaints.avgResolutionHours ? `${Math.round(stats.complaints.avgResolutionHours)}h` : "—"}
          hint="Submission to resolved"
          icon={Clock}
          tone="sky"
        />
        <StatCard
          label="Open workload"
          value={formatNumber(stats.complaints.pending + stats.complaints.assigned + stats.complaints.inProgress + stats.complaints.reopened)}
          hint="Awaiting review or active"
          icon={BarChart3}
          tone="amber"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="font-display text-base font-semibold">Monthly trend</h2>
          <div className="mt-3">
            <MonthlyTrendChart data={monthlyTrend} />
          </div>
        </section>
        <section className="surface p-5">
          <h2 className="font-display text-base font-semibold">Status distribution</h2>
          <div className="mt-3">
            <StatusPieChart data={statusBreakdown.map((row) => ({ name: statusMeta(row.status).label, value: row.count }))} />
          </div>
        </section>
        <section className="surface p-5">
          <h2 className="font-display text-base font-semibold">Category breakdown</h2>
          <div className="mt-3">
            <CategoryBarChart data={categoryBreakdown.map((row) => ({ name: categoryLabel(row.category), value: row.count }))} />
          </div>
        </section>
        <section className="surface p-5">
          <h2 className="font-display text-base font-semibold">Department workload</h2>
          <div className="mt-3">
            <DepartmentBarChart data={departmentBreakdown} />
          </div>
        </section>
      </div>

      <section className="surface mt-5 overflow-hidden">
        <div className="border-b bg-ink-50/70 px-4 py-3 dark:bg-white/[0.03]">
          <h2 className="font-display text-sm font-semibold">Department performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-wider text-ink-400">
                <th className="px-4 py-2.5 font-semibold">Department</th>
                <th className="px-4 py-2.5 font-semibold">Total</th>
                <th className="px-4 py-2.5 font-semibold">Resolved</th>
                <th className="px-4 py-2.5 font-semibold">Resolution rate</th>
                <th className="px-4 py-2.5 font-semibold">Avg. hours</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {performance.map((row) => (
                <tr key={row.department}>
                  <td className="px-4 py-2.5 font-medium">{row.department}</td>
                  <td className="px-4 py-2.5">{formatNumber(row.total)}</td>
                  <td className="px-4 py-2.5">{formatNumber(row.resolved)}</td>
                  <td className="px-4 py-2.5">{row.total ? `${Math.round((row.resolved / row.total) * 100)}%` : "—"}</td>
                  <td className="px-4 py-2.5">{row.avg_hours ? `${Math.round(row.avg_hours)}h` : "—"}</td>
                </tr>
              ))}
              {performance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-400">
                    No department data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface mt-5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold">Export complaint data</h2>
            <p className="mt-1 text-[11px] leading-5 text-ink-500 dark:text-ink-300">
              Download up to 200 matching records as CSV or PDF. Reporter names are included for authorised internal
              use; anonymous reports are not linked publicly.
            </p>
          </div>
          <ExportButtons
            rows={rows}
            columns={[
              { key: "code", label: "Code" },
              { key: "title", label: "Title" },
              { key: "category", label: "Category" },
              { key: "status", label: "Status" },
              { key: "priority", label: "Priority" },
              { key: "department", label: "Department" },
              { key: "staff", label: "Staff" },
              { key: "reporter", label: "Reporter" },
              { key: "location", label: "Location" },
              { key: "created", label: "Created" },
              { key: "resolved", label: "Resolved" },
            ]}
            filename={`ecocampus-complaints-${new Date().toISOString().slice(0, 10)}`}
            title="EcoCampus AI — Complaint export"
            subtitle={`${filteredCount} matching records${from || to ? ` · ${from || "beginning"} to ${to || "today"}` : ""} · Generated ${new Date().toLocaleString("en-IN")}`}
          />
        </div>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4">
          <div>
            <label htmlFor="export-from" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-400">
              From date
            </label>
            <input
              id="export-from"
              type="date"
              name="from"
              defaultValue={from}
              className="h-10 rounded-xl border bg-white px-3 text-xs dark:bg-white/5"
            />
          </div>
          <div>
            <label htmlFor="export-to" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-400">
              To date
            </label>
            <input
              id="export-to"
              type="date"
              name="to"
              defaultValue={to}
              className="h-10 rounded-xl border bg-white px-3 text-xs dark:bg-white/5"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-forest-800 px-4 text-xs font-semibold text-white transition hover:bg-forest-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <Download className="h-3.5 w-3.5" /> Apply range
          </button>
          <p className="text-[10px] text-ink-400">
            {formatNumber(filteredCount)} record{filteredCount === 1 ? "" : "s"} in range · exports include up to 200
          </p>
        </form>
      </section>
    </>
  );
}
