import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { ComplaintFilterBar, Pagination } from "@/components/complaints/filter-bar";
import { EmptyState } from "@/components/ui/misc";
import { countComplaints, getStatusCounts, listComplaints } from "@/lib/complaints";
import { requireRole } from "@/lib/auth";
import { cn, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Complaints" };

const PAGE_SIZE = 12;

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["admin", "super_admin"], "/admin/complaints");
  const params = await searchParams;
  const get = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : "";
  };
  const page = Math.max(1, Number(get("page")) || 1);
  const demo = get("demo");
  const filters = {
    q: get("q") || undefined,
    status: get("status") || undefined,
    category: get("category") || undefined,
    priority: get("priority") || undefined,
    demo: demo === "1" ? true : demo === "0" ? false : undefined,
  };
  const reports = listComplaints({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const total = countComplaints(filters);
  const statusCounts = getStatusCounts({});
  const allCount = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);

  const demoModes = [
    { value: "", label: "All records" },
    { value: "0", label: "Real records" },
    { value: "1", label: "Demo records" },
  ];

  function demoHref(value: string) {
    const query = new URLSearchParams();
    for (const key of ["q", "status", "category", "priority"]) {
      const item = get(key);
      if (item) query.set(key, item);
    }
    if (value) query.set("demo", value);
    const string = query.toString();
    return string ? `/admin/complaints?${string}` : "/admin/complaints";
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Environmental complaints"
        description="Review, assign, verify and close every campus environmental report. Demo records are clearly labelled and kept separate from real data."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border bg-white px-3 py-1.5 text-[11px] font-semibold dark:bg-white/5">
          All <strong className="ml-1">{formatNumber(allCount)}</strong>
        </span>
        {[
          ["Awaiting review", ["submitted", "under_review"]],
          ["Active", ["assigned", "in_progress", "reopened"]],
          ["Resolved", ["resolved", "verified", "closed"]],
          ["Rejected", ["rejected"]],
          ["Archived", ["archived"]],
        ].map(([label, statuses]) => {
          const count = (statuses as string[]).reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0);
          return (
            <span key={label as string} className="rounded-full border px-3 py-1.5 text-[11px] text-ink-500">
              {label as string} <strong className="ml-1 text-ink-800 dark:text-ink-100">{formatNumber(count)}</strong>
            </span>
          );
        })}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {demoModes.map((mode) => (
            <Link
              key={mode.label}
              href={demoHref(mode.value)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition",
                get("demo") === mode.value
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  : "text-ink-500 hover:bg-ink-50 dark:hover:bg-white/5",
              )}
            >
              {mode.label}
            </Link>
          ))}
        </div>
      </div>

      <ComplaintFilterBar
        basePath="/admin/complaints"
        initial={{ q: filters.q, status: filters.status, category: filters.category, priority: filters.priority }}
      />

      <div className="mt-4">
        {reports.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reports.map((report) => (
                <ComplaintCard key={report.id} complaint={report} href={`/admin/complaints/${report.id}`} />
              ))}
            </div>
            <div className="mt-5">
              <Pagination
                page={page}
                total={total}
                pageSize={PAGE_SIZE}
                basePath="/admin/complaints"
                params={{
                  q: filters.q,
                  status: filters.status,
                  category: filters.category,
                  priority: filters.priority,
                  demo: demo || undefined,
                }}
              />
            </div>
          </>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title={total ? "No complaints match these filters" : "No complaints recorded yet"}
            description={
              total
                ? "Clear the search or choose another status, category or demo mode."
                : "Reports submitted by students and staff will appear here for review and assignment."
            }
          />
        )}
      </div>
    </>
  );
}
