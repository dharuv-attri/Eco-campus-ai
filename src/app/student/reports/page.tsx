import type { Metadata } from "next";
import { FileSearch, PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { ComplaintFilterBar, Pagination } from "@/components/complaints/filter-bar";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { countComplaints, getStatusCounts, listComplaints } from "@/lib/complaints";
import { requireRole } from "@/lib/auth";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "My reports" };

const PAGE_SIZE = 9;

export default async function StudentReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole(["student"], "/student/reports");
  const params = await searchParams;
  const get = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : "";
  };
  const page = Math.max(1, Number(get("page")) || 1);
  const filters = {
    reporterId: user.id,
    q: get("q") || undefined,
    status: get("status") || undefined,
    category: get("category") || undefined,
    priority: get("priority") || undefined,
  };
  const reports = await listComplaints({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const total = await countComplaints(filters);
  const statusCounts = await getStatusCounts({ reporterId: user.id });
  const allCount = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);

  return (
    <>
      <PageHeader
        eyebrow="Your contribution"
        title="My environmental reports"
        description="Every report you submit, with its current status and full progress history."
        action={
          <LinkButton href="/student/reports/new">
            <PlusCircle className="h-4 w-4" /> Report a problem
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full border bg-white px-3 py-1.5 text-[11px] font-semibold dark:bg-white/5">
          All <strong className="ml-1">{formatNumber(allCount)}</strong>
        </span>
        {[
          ["Open", ["submitted", "under_review", "assigned", "in_progress", "reopened"]],
          ["Resolved", ["resolved", "verified", "closed"]],
          ["Rejected", ["rejected"]],
        ].map(([label, statuses]) => {
          const count = (statuses as string[]).reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0);
          return (
            <span key={label as string} className="rounded-full border px-3 py-1.5 text-[11px] text-ink-500">
              {label as string} <strong className="ml-1 text-ink-800 dark:text-ink-100">{count}</strong>
            </span>
          );
        })}
      </div>

      <ComplaintFilterBar
        basePath="/student/reports"
        initial={{ q: filters.q, status: filters.status, category: filters.category, priority: filters.priority }}
      />

      <div className="mt-4">
        {reports.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reports.map((report) => (
                <ComplaintCard key={report.id} complaint={report} href={`/student/reports/${report.id}`} />
              ))}
            </div>
            <div className="mt-5">
              <Pagination
                page={page}
                total={total}
                pageSize={PAGE_SIZE}
                basePath="/student/reports"
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
            icon={FileSearch}
            title={total ? "No reports match these filters" : "You have not reported anything yet"}
            description={
              total
                ? "Try clearing the search or choosing a different status."
                : "Spotted an environmental problem? Submit a report with a photo and location so the campus team can act."
            }
            action={
              <LinkButton href="/student/reports/new">
                <PlusCircle className="h-4 w-4" /> Report a problem
              </LinkButton>
            }
          />
        )}
      </div>
    </>
  );
}
