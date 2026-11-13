import Link from "next/link";
import { cn } from "@/lib/utils";

export function LeafMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("h-9 w-9", className)} aria-hidden>
      <rect width="48" height="48" rx="14" fill="url(#leaf-bg)" />
      <path
        d="M14 32.5c0-10.5 7.2-17.8 20-18.5.2 12.4-6.6 20.2-17.7 20.2"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path d="M14 35c3.6-7.8 9.2-12.7 16.7-16" stroke="#A7F3D0" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="32.5" cy="16.5" r="2" fill="#D1FAE5" />
      <defs>
        <linearGradient id="leaf-bg" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14532D" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Brand({
  name = "EcoCampus AI",
  subtitle = "Smart Environmental Management System",
  logoUrl,
  compact = false,
  className,
}: {
  name?: string;
  subtitle?: string;
  logoUrl?: string | null;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label={`${name} home`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="h-9 w-9 rounded-xl object-contain ring-1 ring-black/5"
        />
      ) : (
        <LeafMark className="transition-transform duration-300 group-hover:scale-105" />
      )}
      <span className="leading-none">
        <span className="block font-display text-[17px] font-bold tracking-tight text-ink-900 dark:text-white">
          {name}
        </span>
        {compact ? null : (
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-emerald-700 dark:text-emerald-400">
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
