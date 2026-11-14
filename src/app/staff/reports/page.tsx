import type { Metadata } from "next";
import { FileSearch, PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { ComplaintFilterBar, Pagination } from "@/components/complaints/filter-bar";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { countComplaints, listComplaints } from "@/lib/complaints";
import { requireRole } from "@/lib/auth";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "My reports" };

const PAGE_SIZE = 9;

export default async function StaffReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole(["staff"], "/staff/reports");
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

  return (
    <>
      <PageHeader
        eyebrow="Your reports"
        title="Reports you filed as a campus member"
        description="These are environmental problems you reported yourself. Work assigned to you by an administrator is managed in Assigned work."
        action={
          <LinkButton href="/staff/reports/new">
            <PlusCircle className="h-4 w-4" /> Report a problem
          </LinkButton>
        }
      />

      <p className="mb-4 text-xs text-ink-500 dark:text-ink-300">
        {formatNumber(total)} report{total === 1 ? "" : "s"} filed from your account.
      </p>

      <ComplaintFilterBar
        basePath="/staff/reports"
        initial={{ q: filters.q, status: filters.status, category: filters.category, priority: filters.priority }}
      />

      <div className="mt-4">
        {reports.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reports.map((report) => (
                <ComplaintCard key={report.id} complaint={report} href={`/staff/reports/${report.id}`} />
              ))}
            </div>
            <div className="mt-5">
              <Pagination
                page={page}
                total={total}
                pageSize={PAGE_SIZE}
                basePath="/staff/reports"
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
            title={total ? "No reports match these filters" : "You have not filed a report yet"}
            description={
              total
                ? "Try clearing the search or choosing a different status."
                : "Spotted water wastage, garbage or a broken light? Report it with a photo and location."
            }
            action={
              <LinkButton href="/staff/reports/new">
                <PlusCircle className="h-4 w-4" /> Report a problem
              </LinkButton>
            }
          />
        )}
      </div>
    </>
  );
}
