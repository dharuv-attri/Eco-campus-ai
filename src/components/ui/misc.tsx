import * as React from "react";
import { cn, initials } from "@/lib/utils";
import { ArrowUpRight, Inbox } from "lucide-react";

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-sm",
    xl: "h-20 w-20 text-lg",
  };
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-forest-700 to-emerald-500 font-semibold text-white ring-2 ring-white/60 dark:ring-white/10",
        sizes[size],
        className,
      )}
      aria-hidden={!name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ? `${name}'s avatar` : ""} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-ink-500 dark:text-ink-300">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "emerald",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "emerald" | "amber" | "sky" | "rose" | "violet" | "forest";
  className?: string;
}) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    forest: "bg-forest-700/10 text-forest-800 dark:text-emerald-300",
  };
  return (
    <div className={cn("surface group p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-glow", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">{label}</p>
        {Icon ? (
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tones[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">{hint}</p> : null}
    </div>
  );
}

export function Progress({
  value,
  className,
  tone = "emerald",
}: {
  value: number;
  className?: string;
  tone?: "emerald" | "amber" | "sky" | "rose";
}) {
  const tones = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
    rose: "bg-rose-500",
  };
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800", className)}
      role="progressbar"
      aria-valuenow={Math.min(100, Math.max(0, value))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-700", tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  centered,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  centered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        centered && "items-center text-center md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "mx-auto")}>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2 className="heading-2 mt-3 text-balance">{title}</h2>
        {description ? <p className="muted mt-3 text-[15px] leading-7">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function MetricLink({
  label,
  value,
  href,
}: {
  label: string;
  value: React.ReactNode;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition hover:border-emerald-500/40 hover:bg-emerald-500/5"
    >
      <span className="text-sm text-ink-500">{label}</span>
      <span className="flex items-center gap-1.5 font-semibold">
        {value}
        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </a>
  );
}
