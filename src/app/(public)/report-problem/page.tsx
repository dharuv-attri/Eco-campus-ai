import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, LockKeyhole, MapPin, ShieldAlert, Sparkles } from "lucide-react";
import { ReportForm } from "@/components/forms/report-form";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { listCampusLocations } from "@/lib/content";
import { SITE } from "@/lib/constants";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Report an environmental problem",
  description:
    "Submit a trackable environmental problem report with photos and a precise campus location.",
};

export default async function ReportProblemPage() {
  const [user, settings] = await Promise.all([
    getSessionUser(),
    Promise.resolve(getSettings()),
  ]);
  const locations = await listCampusLocations(false);

  return (
    <div className="relative overflow-hidden py-12 sm:py-16">
      <div className="absolute inset-x-0 top-0 h-72 grid-eco opacity-40" aria-hidden />
      <div className="container-eco relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow">
            <ClipboardList className="h-3.5 w-3.5" /> New environmental report
          </span>
          <h1 className="heading-1 mt-4 text-balance">Report a problem. Make it visible.</h1>
          <p className="muted mx-auto mt-4 max-w-2xl text-base leading-8">
            Describe the problem, add a precise location and attach a clear photo. Every report receives a
            tracking code and a documented status timeline.
          </p>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-400">
            <LockKeyhole className="h-3.5 w-3.5" /> Reporter identities are never shown publicly.
          </p>
        </div>

        <div className="mt-10">
          {user ? (
            <ReportForm
              user={user}
              locations={locations}
              anonymousEnabled={settings.anonymous_reporting_enabled !== "false"}
              detailBase={
                user.role === "staff"
                  ? "/staff/tasks"
                  : user.role === "student"
                    ? "/student/reports"
                    : "/admin/complaints"
              }
            />
          ) : (
            <div className="mx-auto max-w-2xl">
              <div className="surface overflow-hidden">
                <div className="border-b bg-emerald-500/[0.05] p-6 text-center sm:p-8">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <LockKeyhole className="h-7 w-7" />
                  </span>
                  <h2 className="mt-4 font-display text-xl font-semibold">Sign in to submit a report</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500 dark:text-ink-300">
                    A verified account links the report to you for status notifications, lets you respond to
                    staff updates and protects the platform from spam. You can choose to hide your name from
                    other users.
                  </p>
                  <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                    <Link
                      href={`/login?next=${encodeURIComponent("/report-problem")}`}
                      className={buttonVariants.primary + " h-11 px-5"}
                    >
                      Sign in <ArrowRight className="h-4 w-4" />
                    </Link>
                    {settings.registration_open !== "false" ? (
                      <Link href="/signup" className={buttonVariants.outline + " h-11 px-5"}>
                        Create an account
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-4 p-6 text-sm sm:grid-cols-3 sm:p-8">
                  {[
                    { icon: MapPin, title: "Precise location", text: "Pick a campus area, building, floor and landmark." },
                    { icon: Sparkles, title: "AI guidance", text: "Ask EcoBot AI how to describe the problem safely." },
                    { icon: ShieldAlert, title: "Safety first", text: "Do not approach electrical, sewage or traffic hazards." },
                  ].map((item) => (
                    <div key={item.title}>
                      <item.icon className="h-4 w-4 text-emerald-600" />
                      <p className="mt-2 font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-ink-500">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-center text-[11px] leading-5 text-ink-400">
                {SITE.disclaimer}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
