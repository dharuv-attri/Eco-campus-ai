import { Archive, Check, CircleAlert, Clock3, MessageSquare, RotateCcw, Wrench } from "lucide-react";
import { STATUSES, STATUS_META, type StatusValue } from "@/lib/constants";
import { cn, formatDateTime, statusMeta } from "@/lib/utils";
import type { StatusHistory, StaffUpdate } from "@/types";

const STEP_ORDER = STATUSES.filter((status) => status !== "closed") as string[];

export function ComplaintProgress({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status);
  if (status === "rejected") {
    return (
      <div className={cn("flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] p-4", className)}>
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-300" />
        <div>
          <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Report not accepted</p>
          <p className="mt-0.5 text-xs leading-5 text-rose-700/80 dark:text-rose-300/80">
            {meta.description}. Contact the campus administrator if you believe this was a mistake.
          </p>
        </div>
      </div>
    );
  }
  if (status === "archived") {
    return (
      <div className={cn("flex items-start gap-3 rounded-2xl border border-ink-300/50 bg-ink-500/[0.06] p-4 dark:border-ink-700 dark:bg-white/[0.03]", className)}>
        <Archive className="mt-0.5 h-5 w-5 shrink-0 text-ink-500 dark:text-ink-300" />
        <div>
          <p className="text-sm font-semibold">Report archived</p>
          <p className="mt-0.5 text-xs leading-5 text-ink-500 dark:text-ink-300">
            {meta.description}. An administrator can restore it while keeping its history.
          </p>
        </div>
      </div>
    );
  }

  const currentStep = status === "reopened" ? 1 : meta.step;
  const rejectedOrClosed = status === "closed";

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-start justify-between gap-1 overflow-x-auto pb-1">
        {STEP_ORDER.map((step, index) => {
          const stepMeta = STATUS_META[step as StatusValue];
          const complete = stepMeta.step < currentStep || rejectedOrClosed;
          const active = stepMeta.step === currentStep && !rejectedOrClosed;
          return (
            <div key={step} className="flex min-w-[54px] flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    index === 0 ? "bg-transparent" : complete || active ? "bg-emerald-500" : "bg-[var(--border)]",
                  )}
                />
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition",
                    complete
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : active
                        ? "border-emerald-500 bg-white text-emerald-700 ring-4 ring-emerald-500/15 dark:bg-[#101f19] dark:text-emerald-300"
                        : "border-[var(--border)] bg-white text-ink-400 dark:bg-[#101f19]",
                  )}
                >
                  {complete ? <Check className="h-3.5 w-3.5" /> : stepMeta.step}
                </span>
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    index === STEP_ORDER.length - 1
                      ? "bg-transparent"
                      : complete
                        ? "bg-emerald-500"
                        : "bg-[var(--border)]",
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-2 text-[9px] font-semibold uppercase tracking-wide leading-tight sm:text-[10px]",
                  active ? "text-forest-800 dark:text-emerald-300" : "text-ink-400",
                )}
              >
                {stepMeta.label}
              </span>
            </div>
          );
        })}
      </div>
      {status === "reopened" ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-3 py-2 text-[11px] font-medium text-orange-700 dark:text-orange-300">
          <RotateCcw className="h-3.5 w-3.5" /> Reopened — the reporter says the issue is not fully resolved.
        </p>
      ) : null}
    </div>
  );
}

interface TimelineEvent {
  id: string;
  at: string;
  title: string;
  note?: string | null;
  actor?: string | null;
  kind: "status" | "update" | "created";
  tone?: string;
}

export function ComplaintTimeline({
  history,
  staffUpdates = [],
  className,
}: {
  history: StatusHistory[];
  staffUpdates?: StaffUpdate[];
  className?: string;
}) {
  const events: TimelineEvent[] = [
    ...history.map((item) => ({
      id: `h-${item.id}`,
      at: item.created_at,
      title:
        item.from_status === null
          ? "Report submitted"
          : `Status changed to ${statusMeta(item.to_status).label}`,
      note: item.note,
      actor: item.changed_by_name,
      kind: item.from_status === null ? ("created" as const) : ("status" as const),
    })),
    ...staffUpdates.map((item) => ({
      id: `s-${item.id}`,
      at: item.created_at,
      title:
        item.update_type === "resolution"
          ? "Resolution update"
          : item.update_type === "progress"
            ? "Progress update"
            : "Staff note",
      note: item.message,
      actor: item.staff_name,
      kind: "update" as const,
    })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  if (!events.length) {
    return <p className="text-sm text-ink-500">No history yet.</p>;
  }

  return (
    <ol className={cn("relative space-y-5 border-l pl-6", className)}>
      {events.map((event, index) => {
        const Icon = event.kind === "update" ? Wrench : event.kind === "created" ? Check : Clock3;
        return (
          <li key={event.id} className="relative">
            <span
              className={cn(
                "absolute -left-[35px] flex h-7 w-7 items-center justify-center rounded-full border bg-white shadow-sm dark:bg-[#101f19]",
                index === events.length - 1
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-300"
                  : "border-[var(--border)] text-ink-400",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <p className="text-sm font-semibold">{event.title}</p>
              <time className="text-[10px] text-ink-400">{formatDateTime(event.at)}</time>
            </div>
            {event.actor ? (
              <p className="mt-0.5 text-[11px] text-ink-400">
                <MessageSquare className="mr-1 inline h-3 w-3" />
                {event.actor}
              </p>
            ) : null}
            {event.note ? (
              <p className="mt-1.5 whitespace-pre-line rounded-xl bg-ink-50 px-3 py-2 text-xs leading-5 text-ink-600 dark:bg-white/[0.03] dark:text-ink-300">
                {event.note}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
