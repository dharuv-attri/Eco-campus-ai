import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, Sparkles, Leaf } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME, SITE } from "@/lib/constants";
import { getSettings } from "@/lib/settings";

/**
 * Password-recovery pages must stay reachable even when a session exists.
 * The recovery link from Supabase establishes a temporary session before the
 * user has chosen a new password, so redirecting signed-in visitors away from
 * these pages would bounce them to the dashboard and break the reset flow.
 */
const RECOVERY_PATHS = new Set(["/forgot-password", "/reset-password"]);

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathHeader = (await headers()).get("x-ecocampus-path") ?? "";
  const isRecoveryPage = RECOVERY_PATHS.has(pathHeader.split("?")[0]);
  const [user, settings] = await Promise.all([getSessionUser(), Promise.resolve(getSettings())]);
  if (user && !isRecoveryPage) redirect(ROLE_HOME[user.role] ?? "/");

  return (
    <div className="min-h-dvh bg-[#f4faf6] dark:bg-[#08110d]">
      <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden overflow-hidden bg-forest-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute inset-0 grid-eco opacity-30" />
          <div className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-forest-500/30 blur-3xl" />
          <div className="relative">
            <Brand
              name={settings.site_name || "EcoCampus AI"}
              subtitle={settings.site_subtitle || "Smart Environmental Management System"}
              logoUrl={settings.logo_url || null}
            />
          </div>

          <div className="relative max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
              <Leaf className="h-3 w-3" /> Campus environmental platform
            </span>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-[-0.03em] text-balance">
              Every report is a step toward a greener campus.
            </h2>
            <p className="mt-4 text-sm leading-7 text-emerald-100/65">
              Join students and staff using EcoCampus AI to report environmental problems, follow real
              progress and celebrate verified improvements at {SITE.university}.
            </p>
            <div className="mt-8 grid gap-3">
              {[
                { icon: ShieldCheck, text: "Role-based access with server-side permissions" },
                { icon: Sparkles, text: "EcoBot AI for guidance in English, Hindi & Hinglish" },
                { icon: Leaf, text: "Transparent, evidence-based complaint tracking" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-sm text-emerald-100/80">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                    <item.icon className="h-4 w-4 text-emerald-300" />
                  </span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          <p className="relative max-w-md text-[11px] leading-5 text-emerald-100/35">
            Independent project. Not an official Lamrin Tech Skills University Punjab service unless
            authorized. Campus location data is based on official LTSU pages.
          </p>
        </aside>

        <div className="relative flex min-h-dvh flex-col">
          <div className="flex items-center justify-between px-5 py-5 sm:px-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition hover:text-forest-800 dark:text-ink-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to website
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-4 sm:px-8">
            <div className="w-full max-w-md">
              <div className="mb-6 flex justify-center lg:hidden">
                <Brand
                  name={settings.site_name || "EcoCampus AI"}
                  subtitle={settings.site_subtitle || "Smart Environmental Management System"}
                  logoUrl={settings.logo_url || null}
                />
              </div>
              {children}
            </div>
          </div>
          <div className="px-5 pb-6 text-center text-[10px] text-ink-400 sm:px-8">
            By continuing, you agree to responsible use of this campus environmental platform.
          </div>
        </div>
      </div>
    </div>
  );
}
