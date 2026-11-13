"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, LayoutDashboard } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Lang, TranslationKey } from "@/lib/i18n";
import type { SessionUser } from "@/types";

const navItems: Array<{ href: string; key: TranslationKey }> = [
  { href: "/", key: "nav.home" },
  { href: "/about", key: "nav.about" },
  { href: "/report-problem", key: "nav.report" },
  { href: "/campus-map", key: "nav.map" },
  { href: "/environmental-awareness", key: "nav.awareness" },
  { href: "/announcements", key: "nav.announcements" },
];

export function SiteHeader({
  user,
  lang,
  labels,
  logoUrl,
  siteName,
  subtitle,
  registrationOpen,
}: {
  user: SessionUser | null;
  lang: Lang;
  labels: Record<string, string>;
  logoUrl: string | null;
  siteName: string;
  subtitle: string;
  registrationOpen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const dashboardHref = user
    ? user.role === "student"
      ? "/student/dashboard"
      : user.role === "staff"
        ? "/staff/dashboard"
        : "/admin/dashboard"
    : "/login";

  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-[#0a1410]/80">
      <div className="container-eco flex h-[70px] items-center justify-between gap-4">
        <Brand name={siteName} subtitle={subtitle} logoUrl={logoUrl} compact />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-[13px] font-medium transition",
                  active
                    ? "bg-emerald-500/10 text-forest-800 dark:text-emerald-300"
                    : "text-ink-600 hover:bg-ink-100/70 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-white/5 dark:hover:text-white",
                )}
              >
                {labels[item.key] ?? item.key}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher lang={lang} />
          <ThemeToggle />
          {user ? (
            <Link href={dashboardHref} className={cn(buttonVariants.primary, "h-9 px-3.5 text-xs")}>
              <LayoutDashboard className="h-4 w-4" />
              {labels["nav.dashboard"]}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-700 transition hover:text-forest-800 dark:text-ink-200"
              >
                {labels["nav.login"]}
              </Link>
              {registrationOpen ? (
                <Link href="/signup" className={cn(buttonVariants.primary, "h-9 px-3.5 text-xs")}>
                  {labels["nav.signup"]}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white/70 md:hidden dark:bg-white/5"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div
          id="mobile-navigation"
          className="border-t bg-white px-4 pb-5 pt-3 md:hidden dark:bg-[#0a1410]"
        >
          <nav className="grid gap-0.5" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm font-medium",
                  pathname === item.href
                    ? "bg-emerald-500/10 text-forest-800 dark:text-emerald-300"
                    : "text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-white/5",
                )}
              >
                {labels[item.key] ?? item.key}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center gap-2 border-t pt-4">
            <LanguageSwitcher lang={lang} />
            <ThemeToggle />
            {user ? (
              <Link href={dashboardHref} className={cn(buttonVariants.primary, "ml-auto h-9 px-4 text-xs")}>
                {labels["nav.dashboard"]}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className={cn(buttonVariants.outline, "ml-auto h-9 px-3 text-xs")}
                >
                  {labels["nav.login"]}
                </Link>
                {registrationOpen ? (
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className={cn(buttonVariants.primary, "h-9 px-3 text-xs")}
                  >
                    {labels["nav.signup"]}
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
