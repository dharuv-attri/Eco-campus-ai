import { cn, priorityLabel, statusMeta } from "@/lib/utils";
import type { StatusValue } from "@/lib/constants";

const statusTones: Record<string, string> = {
  sky: "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300",
  amber: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
  violet: "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-300",
  blue: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
  emerald: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
  green: "bg-forest-500/10 text-forest-700 border-forest-500/20 dark:text-emerald-300",
  slate: "bg-ink-500/10 text-ink-600 border-ink-500/20 dark:text-ink-300",
  rose: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300",
  orange: "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-300",
};

const priorityTones: Record<string, string> = {
  low: "bg-ink-500/10 text-ink-600 border-ink-500/20 dark:text-ink-300",
  medium: "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300",
  high: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
  emergency: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300",
};

export function Badge({
  children,
  className,
  tone = "emerald",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: keyof typeof statusTones;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        statusTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status);
  return (
    <Badge tone={meta.tone as keyof typeof statusTones} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        priorityTones[priority] ?? priorityTones.medium,
        className,
      )}
    >
      {priorityLabel(priority)}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300",
        className,
      )}
    >
      Demo
    </span>
  );
}

export type { StatusValue };
