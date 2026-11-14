import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { ComplaintFilterBar, Pagination } from "@/components/complaints/filter-bar";
import { EmptyState } from "@/components/ui/misc";
import { countComplaints, getStatusCounts, listComplaints } from "@/lib/complaints";
import { requireRole } from "@/lib/auth";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Assigned work" };

const PAGE_SIZE = 9;

export default async function StaffTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole(["staff"], "/staff/tasks");
  const params = await searchParams;
  const get = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : "";
  };
  const page = Math.max(1, Number(get("page")) || 1);
  const access = { userId: user.id, departmentId: user.departmentId };
  const filters = {
    staffAccess: access,
    excludeArchived: get("status") !== "archived",
    q: get("q") || undefined,
    status: get("status") || undefined,
    category: get("category") || undefined,
    priority: get("priority") || undefined,
  };
  const reports = await listComplaints({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const total = await countComplaints(filters);
  const statusCounts = await getStatusCounts({ staffAccess: access, excludeArchived: true });
  const allCount = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);
  const openCount = ["submitted", "under_review", "assigned", "in_progress", "reopened"].reduce(
    (sum, status) => sum + (statusCounts[status] ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Your queue"
        title="Assigned environmental work"
        description="Reports assigned directly to you or routed to your department. Keep statuses current so reporters can follow progress."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full border bg-white px-3 py-1.5 text-[11px] font-semibold dark:bg-white/5">
          All <strong className="ml-1">{formatNumber(allCount)}</strong>
        </span>
        <span className="rounded-full border px-3 py-1.5 text-[11px] text-ink-500">
          Open <strong className="ml-1 text-ink-800 dark:text-ink-100">{formatNumber(openCount)}</strong>
        </span>
        <span className="rounded-full border px-3 py-1.5 text-[11px] text-ink-500">
          Resolved <strong className="ml-1 text-ink-800 dark:text-ink-100">{formatNumber((statusCounts.resolved ?? 0) + (statusCounts.verified ?? 0) + (statusCounts.closed ?? 0))}</strong>
        </span>
        <span className="rounded-full border px-3 py-1.5 text-[11px] text-ink-500">
          Rejected <strong className="ml-1 text-ink-800 dark:text-ink-100">{formatNumber(statusCounts.rejected ?? 0)}</strong>
        </span>
      </div>

      <ComplaintFilterBar
        basePath="/staff/tasks"
        initial={{ q: filters.q, status: filters.status, category: filters.category, priority: filters.priority }}
      />

      <div className="mt-4">
        {reports.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reports.map((report) => (
                <ComplaintCard key={report.id} complaint={report} href={`/staff/tasks/${report.id}`} />
              ))}
            </div>
            <div className="mt-5">
              <Pagination
                page={page}
                total={total}
                pageSize={PAGE_SIZE}
                basePath="/staff/tasks"
                params={{
                  q: filters.q,
                  status: filters.status,
                  category: filters.category,
                  priority: filters.priority,
                }}
              />
            </div>
          </>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title={total ? "No work matches these filters" : "No work assigned yet"}
            description={
              total
                ? "Try a different status, category or search term."
                : "Reports assigned to you or your department will appear here. Check back after an administrator routes new work."
            }
          />
        )}
      </div>
    </>
  );
}
