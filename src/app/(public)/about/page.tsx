import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  HeartHandshake,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/misc";
import { SITE } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { getPublicStats } from "@/lib/analytics";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About EcoCampus AI",
  description:
    "Learn how EcoCampus AI supports environmental reporting at Lamrin Tech Skills University Punjab, and why it is an independent initiative.",
};

export default async function AboutPage() {
  const settings = await getSettings();
  const stats = await getPublicStats();

  return (
    <>
      <section className="relative overflow-hidden border-b py-16 sm:py-20">
        <div className="absolute inset-0 grid-eco opacity-40" aria-hidden />
        <div className="container-eco relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="eyebrow">
              <Leaf className="h-3.5 w-3.5" /> About the platform
            </span>
            <h1 className="heading-1 mt-5 max-w-3xl text-balance">
              Built for the campus community, powered by transparency.
            </h1>
            <p className="muted mt-5 max-w-2xl text-base leading-8">
              {settings.about_summary ||
                "EcoCampus AI gives every student and staff member a clear way to report environmental problems, follow real progress, and celebrate verified improvements. Every report is traceable from submission to closure."}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/report-problem" className={buttonVariants.primary + " h-11 px-5"}>
                Report a problem <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/campus-map" className={buttonVariants.outline + " h-11 px-5"}>
                <MapPin className="h-4 w-4" /> View campus map
              </Link>
            </div>
          </div>
          <div className="surface p-6 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Important disclaimer
            </p>
            <p className="mt-2 text-sm leading-7 text-ink-600 dark:text-ink-200">{SITE.disclaimer}</p>
            <div className="mt-5 space-y-3 border-t pt-5 text-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-ink-600 dark:text-ink-200">
                  Role-based access is enforced on the server. Students cannot grant themselves administrator
                  access.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-ink-600 dark:text-ink-200">
                  Demo records are always labelled. Real reports are never hidden behind sample data.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-ink-600 dark:text-ink-200">
                  The map is centred on LTSU&apos;s official map location. Building pins are added only after
                  administrator verification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-eco grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Reports recorded", value: formatNumber(stats.total), icon: Leaf },
            { label: "Resolved / verified", value: formatNumber(stats.resolved), icon: BadgeCheck },
            { label: "Students registered", value: formatNumber(stats.students), icon: GraduationCap },
            { label: "This month", value: formatNumber(stats.thisMonth), icon: Target },
          ].map((metric) => (
            <div key={metric.label} className="surface p-5">
              <metric.icon className="h-5 w-5 text-emerald-600" />
              <p className="mt-3 font-display text-3xl font-semibold">{metric.value}</p>
              <p className="mt-1 text-xs text-ink-500">{metric.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-white/60 py-16 dark:bg-white/[0.02]">
        <div className="container-eco grid gap-10 lg:grid-cols-2">
          <div>
            <span className="eyebrow">
              <Target className="h-3.5 w-3.5" /> Why it exists
            </span>
            <h2 className="heading-2 mt-4">A clear loop from observation to resolution</h2>
            <p className="muted mt-4 text-sm leading-7">
              Environmental problems often go unreported because students do not know who to tell, or because
              there is no visible follow-up. EcoCampus AI closes that gap with a documented workflow: report,
              review, assign, resolve, verify and close.
            </p>
            <p className="muted mt-3 text-sm leading-7">
              Each report receives a tracking code. Reporters can follow every status change in their portal or
              through public tracking, while administrators and assigned staff see the operational detail they
              need. Resolution evidence and feedback remain attached to the record.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {[
                "One report per problem, with photo evidence and a precise location.",
                "Department routing and staff assignment with notifications.",
                "Verification before points are awarded — participation is recognised, not assumed.",
                "Reopen and feedback options when a fix does not hold.",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="text-ink-600 dark:text-ink-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Users, title: "For students", text: "Report problems, add photos, track progress and earn green points for verified reports and quizzes." },
              { icon: Building2, title: "For staff", text: "See work assigned to you or your department, add progress updates and record resolution evidence." },
              { icon: ShieldCheck, title: "For administrators", text: "Validate reports, assign work, verify resolutions, manage users and publish campus content." },
              { icon: HeartHandshake, title: "For the campus", text: "A shared record of environmental action that supports accountability and long-term improvement." },
            ].map((item) => (
              <div key={item.title} className="surface p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-500 dark:text-ink-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-eco">
          <SectionHeading
            eyebrow="Official campus information"
            title="About Lamrin Tech Skills University Punjab"
            description="The following facts are drawn from official LTSU public pages. EcoCampus AI does not add or invent campus statistics."
            action={
              <a
                href={SITE.website}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants.outline + " h-9 px-4 text-xs"}
              >
                Official website <ExternalLink className="h-3.5 w-3.5" />
              </a>
            }
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "University", value: SITE.university },
              { label: "Established", value: "By Punjab State Act No. 22 of 2021" },
              { label: "Recognition", value: "UGC 2(f) recognition" },
              { label: "Address", value: SITE.address },
              { label: "Campus", value: "Approximately 100-acre campus near Ropar · about 40 minutes from Chandigarh" },
              { label: "Contact", value: `${SITE.phone} · ${SITE.mobile} · ${SITE.email}` },
            ].map((item) => (
              <div key={item.label} className="surface p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-ink-700 dark:text-ink-200">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-5 text-ink-400">
            Source: official LTSU home, about, how-to-reach and contact pages. Verify current details with the
            university. EcoCampus AI is an independent project and is not an official university service unless
            written authorization is obtained.
          </p>
        </div>
      </section>

      <section className="border-t py-16">
        <div className="container-eco grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="surface p-6 sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="heading-3 mt-4">Technology & safety</h2>
            <p className="muted mt-2 text-sm leading-7">
              EcoCampus AI is built with Next.js, React, TypeScript and Tailwind CSS. The included demo uses a
              local SQLite database so the complete workflow runs without external credentials. Production
              deployments can move to PostgreSQL via Supabase with row-level security; see the project README and
              database notes for the schema and environment variables.
            </p>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {[
                "Server-side authorization on every mutation",
                "Session cookies are HTTP-only and same-site",
                "Uploaded images are validated by type and size",
                "AI keys stay on the server; a safe fallback works without them",
                "Rate limiting on reports, chat and authentication",
                "Audit logging for administrative actions",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="text-ink-600 dark:text-ink-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="surface flex flex-col justify-between p-6 sm:p-8">
            <div>
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <h2 className="heading-3 mt-4">Use the platform responsibly</h2>
              <p className="muted mt-2 text-sm leading-7">
                EcoCampus AI is not an emergency service. For fire, injury, exposed wiring or immediate danger,
                contact campus security or emergency services first. Never put yourself at risk to photograph or
                inspect a hazard.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/environmental-awareness" className={buttonVariants.soft + " h-9 px-4 text-xs"}>
                Awareness centre
              </Link>
              <Link href="/announcements" className={buttonVariants.outline + " h-9 px-4 text-xs"}>
                Announcements
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
