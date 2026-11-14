import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Clock, Search, ShieldCheck, Users, X } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { EmptyState, StatCard } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { formatDateTime, formatNumber, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 25;

interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  ip: string | null;
  created_at: string;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["super_admin", "admin"], "/admin/audit");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const where = q
    ? `WHERE actor_name LIKE ? OR action LIKE ? OR entity_type LIKE ? OR entity_id LIKE ? OR details LIKE ? OR ip LIKE ?`
    : "";
  const like = `%${q}%`;
  const searchArgs = q ? [like, like, like, like, like, like] : [];

  const rows = await all<AuditRow>(
    `SELECT id, actor_id, actor_name, action, entity_type, entity_id, details, ip, created_at
     FROM admin_audit_logs
     ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    ...searchArgs,
    PAGE_SIZE,
    offset,
  );
  const total = (await one<{ count: number }>(`SELECT COUNT(*) AS count FROM admin_audit_logs ${where}`, ...searchArgs))?.count ?? 0;
  const totals = await one<{ total: number; last24: number; actors: number }>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS last24,
       COUNT(DISTINCT actor_name) AS actors
     FROM admin_audit_logs`,
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number) {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (target > 1) query.set("page", String(target));
    const string = query.toString();
    return string ? `/admin/audit?${string}` : "/admin/audit";
  }

  return (
    <>
      <PageHeader
        eyebrow="Governance & accountability"
        title="Audit log"
        description="A permanent, read-only trail of administrative actions, security events and report lifecycle changes. Only administrators can view this page; entries cannot be edited or deleted from the portal."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total events"
          value={formatNumber(totals?.total ?? 0)}
          hint="All recorded activity"
          icon={ShieldCheck}
          tone="forest"
        />
        <StatCard
          label="Last 24 hours"
          value={formatNumber(totals?.last24 ?? 0)}
          hint="Recent platform activity"
          icon={Activity}
          tone="emerald"
        />
        <StatCard
          label="Distinct actors"
          value={formatNumber(totals?.actors ?? 0)}
          hint="People or system processes"
          icon={Users}
          tone="sky"
        />
        <StatCard
          label="Matching entries"
          value={formatNumber(total)}
          hint={q ? `Filtered by “${q}”` : "No active search filter"}
          icon={Clock}
          tone="violet"
        />
      </div>

      <form
        method="get"
        className="surface mb-4 flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:p-4"
        role="search"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search actor, action, entity, details or IP address…"
            className="pl-9"
            aria-label="Search audit log"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" size="md" className="flex-1 sm:flex-none">
            <Search className="h-4 w-4" /> Search
          </Button>
          {q ? (
            <Link
              href="/admin/audit"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Link>
          ) : null}
        </div>
      </form>

      {rows.length ? (
        <>
          <div className="surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-left text-sm">
                <caption className="sr-only">Administrative audit log entries, newest first</caption>
                <thead>
                  <tr className="border-b bg-ink-50/70 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400 dark:bg-white/[0.03]">
                    <th scope="col" className="px-4 py-3">
                      When
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Actor
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Action
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Entity
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Details
                    </th>
                    <th scope="col" className="px-4 py-3">
                      IP address
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b align-top last:border-0 hover:bg-emerald-500/[0.03] dark:hover:bg-white/[0.02]"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="block text-xs font-semibold">{formatDateTime(row.created_at)}</span>
                        <span className="mt-0.5 block text-[10px] text-ink-400">{timeAgo(row.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block text-xs font-semibold">{row.actor_name || "System"}</span>
                        {row.actor_id ? (
                          <span className="mt-0.5 block font-mono text-[10px] text-ink-400">{row.actor_id}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">{row.action}</td>
                      <td className="px-4 py-3">
                        {row.entity_type || row.entity_id ? (
                          <>
                            <span className="flex w-fit items-center rounded-full border bg-white px-2 py-0.5 text-[10px] font-semibold capitalize dark:bg-white/5">
                              {(row.entity_type || "record").replace(/_/g, " ")}
                            </span>
                            {row.entity_id ? (
                              <span className="mt-1 block max-w-[180px] truncate font-mono text-[10px] text-ink-400">
                                {row.entity_id}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-xs text-ink-400">—</span>
                        )}
                      </td>
                      <td className="max-w-[280px] px-4 py-3">
                        <span className="block whitespace-pre-line break-words text-xs text-ink-600 dark:text-ink-300">
                          {row.details || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-ink-400">
                        {row.ip || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {formatNumber(total)} entries
              {" · "}Page {page} of {pages}
            </p>
            {pages > 1 ? (
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={pageHref(page - 1)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-ink-50 dark:hover:bg-white/5"
                  >
                    Previous
                  </Link>
                ) : null}
                {page < pages ? (
                  <Link
                    href={pageHref(page + 1)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-ink-50 dark:hover:bg-white/5"
                  >
                    Next
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title={q ? "No audit entries match this search" : "No audit entries recorded yet"}
          description={
            q
              ? "Try a different actor name, action, entity or IP address, or clear the search filter."
              : "Sign-ins, report changes, user approvals and content updates will be recorded here automatically."
          }
          action={
            q ? (
              <Link
                href="/admin/audit"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border px-4 text-xs font-semibold transition hover:bg-ink-50 dark:hover:bg-white/5"
              >
                <X className="h-3.5 w-3.5" /> Clear search
              </Link>
            ) : undefined
          }
        />
      )}
    </>
  );
}
