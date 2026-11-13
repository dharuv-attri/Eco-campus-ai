"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ClipboardList,
  FileText,
  Globe2,
  Home,
  LayoutDashboard,
  Leaf,
  LogOut,
  Map,
  Megaphone,
  Menu,
  PlusCircle,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { LeafMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Avatar } from "@/components/ui/misc";
import { ROLE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

export type PortalIcon =
  | "dashboard"
  | "reports"
  | "new"
  | "bell"
  | "trophy"
  | "leaf"
  | "user"
  | "tasks"
  | "users"
  | "building"
  | "map"
  | "globe"
  | "megaphone"
  | "book"
  | "chart"
  | "audit";

const icons: Record<PortalIcon, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  reports: FileText,
  new: PlusCircle,
  bell: Bell,
  trophy: Trophy,
  leaf: Leaf,
  user: UserRound,
  tasks: ClipboardList,
  users: Users,
  building: Building2,
  map: Map,
  globe: Globe2,
  megaphone: Megaphone,
  book: BookOpen,
  chart: BarChart3,
  audit: ShieldCheck,
};

export interface PortalNavItem {
  href: string;
  label: string;
  icon: PortalIcon;
  badge?: number;
}

export function PortalShell({
  user,
  nav,
  siteName,
  subtitle,
  unread,
  lang = "en",
  children,
}: {
  user: SessionUser;
  nav: PortalNavItem[];
  siteName: string;
  subtitle: string;
  unread: number;
  lang?: "en" | "hi";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  function isActive(href: string) {
    if (href.endsWith("/dashboard")) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-dvh bg-[var(--background)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col bg-forest-950 text-emerald-50 lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <LeafMark className="h-9 w-9" />
            <span className="leading-none">
              <span className="block font-display text-[16px] font-bold tracking-tight text-white">{siteName}</span>
              <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                {subtitle}
              </span>
            </span>
          </Link>
        </div>

        <div className="px-4 pt-5">
          <p className="px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-400/70">Workspace</p>
        </div>
        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-6" aria-label="Portal navigation">
          {nav.map((item) => {
            const Icon = icons[item.icon];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
                  active
                    ? "bg-white/10 text-white shadow-inner ring-1 ring-white/10"
                    : "text-emerald-100/65 hover:bg-white/[0.06] hover:text-white",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-[18px] w-[18px]", active ? "text-emerald-300" : "text-emerald-200/50")} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-forest-950">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-2.5">
            <Avatar name={user.fullName} src={user.profileImage} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user.fullName}</p>
              <p className="truncate text-[10px] text-emerald-200/60">{ROLE_LABEL[user.role] ?? user.role}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="rounded-lg p-1.5 text-emerald-200/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <Link
            href="/"
            className="mt-2 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-semibold text-emerald-200/60 transition hover:text-white"
          >
            <Home className="h-3 w-3" /> Back to public site
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[290px] flex-col bg-forest-950 text-emerald-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <Link href="/" className="flex items-center gap-2.5">
                <LeafMark className="h-8 w-8" />
                <span className="font-display text-sm font-bold text-white">{siteName}</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-emerald-200/70 hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Mobile portal navigation">
              {nav.map((item) => {
                const Icon = icons[item.icon];
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      active ? "bg-white/10 text-white" : "text-emerald-100/70 hover:bg-white/[0.06]",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-emerald-500 px-1.5 text-[9px] font-bold text-forest-950">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={logout}
              className="m-3 flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-white"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-30 border-b bg-white/85 backdrop-blur-xl dark:bg-[#0a1410]/85">
          <div className="flex h-[64px] items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 flex-1 sm:block">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                {ROLE_LABEL[user.role] ?? "Portal"} workspace
              </p>
              <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                {user.department || user.course || "Lamrin Tech Skills University Punjab"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <LanguageSwitcher lang={lang} compact />
              <ThemeToggle />
              <Link
                href={`${nav[0]?.href.split("/").slice(0, 2).join("/")}/notifications`}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white/60 text-ink-600 transition hover:bg-white dark:bg-white/5 dark:text-ink-200"
                aria-label={unread ? `${unread} unread notifications` : "Notifications"}
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unread ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-forest-950 ring-2 ring-white dark:ring-[#0a1410]">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
              <Link
                href={`${nav[0]?.href.split("/").slice(0, 2).join("/")}/profile`}
                className="hidden items-center gap-2 rounded-xl border bg-white/60 py-1 pl-1 pr-3 transition hover:bg-white dark:bg-white/5 md:flex"
              >
                <Avatar name={user.fullName} src={user.profileImage} size="sm" />
                <span className="max-w-[110px] truncate text-xs font-semibold">{user.fullName.split(" ")[0]}</span>
              </Link>
            </div>
          </div>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500 dark:text-ink-300">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
