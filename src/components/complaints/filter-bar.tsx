"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { PROBLEM_CATEGORIES, PRIORITIES, STATUSES } from "@/lib/constants";
import { categoryLabel, cn, statusMeta } from "@/lib/utils";

export interface ComplaintFilterValues {
  q?: string;
  status?: string;
  category?: string;
  priority?: string;
}

export function ComplaintFilterBar({
  basePath,
  initial,
  showStatus = true,
  showCategory = true,
  showPriority = true,
  className,
}: {
  basePath: string;
  initial: ComplaintFilterValues;
  showStatus?: boolean;
  showCategory?: boolean;
  showPriority?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<ComplaintFilterValues>({
    q: initial.q ?? "",
    status: initial.status ?? "",
    category: initial.category ?? "",
    priority: initial.priority ?? "",
  });

  function apply(next: ComplaintFilterValues) {
    setValues(next);
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.status) params.set("status", next.status);
    if (next.category) params.set("category", next.category);
    if (next.priority) params.set("priority", next.priority);
    const query = params.toString();
    startTransition(() => router.push(query ? `${basePath}?${query}` : basePath));
  }

  const hasFilters = Boolean(values.q || values.status || values.category || values.priority);
  const statusOptions = ["", ...STATUSES, "rejected", "reopened", "archived"];

  return (
    <div className={cn("surface p-3 sm:p-4", pending && "opacity-70", className)}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <form
          className="relative flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            apply(values);
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={values.q}
            onChange={(event) => setValues((prev) => ({ ...prev, q: event.target.value }))}
            placeholder="Search by code, title, building…"
            className="pl-9"
            aria-label="Search complaints"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="hidden h-4 w-4 text-ink-400 sm:block" aria-hidden />
          {showStatus ? (
            <Select
              aria-label="Filter by status"
              value={values.status}
              onChange={(event) => apply({ ...values, status: event.target.value })}
              className="h-10 w-auto min-w-[130px] py-0 text-xs"
            >
              <option value="">All statuses</option>
              {statusOptions.slice(1).map((status) => (
                <option key={status} value={status}>
                  {statusMeta(status).label}
                </option>
              ))}
            </Select>
          ) : null}
          {showCategory ? (
            <Select
              aria-label="Filter by category"
              value={values.category}
              onChange={(event) => apply({ ...values, category: event.target.value })}
              className="h-10 w-auto min-w-[140px] py-0 text-xs"
            >
              <option value="">All categories</option>
              {PROBLEM_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </Select>
          ) : null}
          {showPriority ? (
            <Select
              aria-label="Filter by priority"
              value={values.priority}
              onChange={(event) => apply({ ...values, priority: event.target.value })}
              className="h-10 w-auto min-w-[120px] py-0 text-xs"
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </Select>
          ) : null}
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => apply({ q: "", status: "", category: "", priority: "" })}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          ) : null}
        </div>
      </div>
      {values.category ? (
        <p className="mt-2 text-[10px] text-ink-400">
          Showing {categoryLabel(values.category)} reports
        </p>
      ) : null}
    </div>
  );
}

export function Pagination({
  page,
  total,
  pageSize,
  basePath,
  params,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) {
    return (
      <p className="text-center text-xs text-ink-400">
        {total} report{total === 1 ? "" : "s"}
      </p>
    );
  }
  function href(target: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    query.set("page", String(target));
    return `${basePath}?${query.toString()}`;
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-ink-400">
        Page {page} of {pages} · {total} reports
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <a
            href={href(page - 1)}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-ink-50 dark:hover:bg-white/5"
          >
            Previous
          </a>
        ) : null}
        {page < pages ? (
          <a
            href={href(page + 1)}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-ink-50 dark:hover:bg-white/5"
          >
            Next
          </a>
        ) : null}
      </div>
    </div>
  );
}
