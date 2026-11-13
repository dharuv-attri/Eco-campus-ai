import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Droplets,
  Leaf,
  MapPin,
  MessageCircleQuestion,
  Recycle,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { CampusMap } from "@/components/maps/campus-map";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/ui/misc";
import { SectionHeading } from "@/components/ui/misc";
import { getPublicStats } from "@/lib/analytics";
import { listPublicComplaints } from "@/lib/complaints";
import {
  listMapIssues,
  listPublishedAnnouncements,
  listPublishedArticles,
  getVerifiedLocationsWithPins,
} from "@/lib/content";
import { GREEN_CHALLENGES, SITE } from "@/lib/constants";
import { getSections, getSettings, isSectionEnabled } from "@/lib/settings";
import { formatNumber, timeAgo, truncate } from "@/lib/utils";
import { one } from "@/lib/db";

export const metadata: Metadata = {
  title: "Report. Track. Resolve. Build a Greener Campus.",
  description:
    "EcoCampus AI helps students and staff at Lamrin Tech Skills University Punjab report environmental problems, track progress and celebrate verified improvements.",
};

const steps = [
  {
    icon: Camera,
    title: "Spot & report",
    description: "Describe the environmental problem, add a precise location and attach a clear photo.",
  },
  {
    icon: ClipboardCheck,
    title: "Review & assign",
    description: "An administrator validates the report and routes it to the responsible department.",
  },
  {
    icon: Building2,
    title: "Resolve on site",
    description: "Assigned staff record progress, add evidence and mark the work complete.",
  },
  {
    icon: BadgeCheck,
    title: "Verify & celebrate",
    description: "Verified resolutions earn green points, close the loop and build a cleaner campus.",
  },
];

export default async function HomePage() {
  const settings = getSettings();
  const sections = getSections();
  const stats = getPublicStats();
  const recent = listPublicComplaints(6);
  const issues = listMapIssues(80);
  const locations = getVerifiedLocationsWithPins();
  const articles = listPublishedArticles(3);
  const announcements = listPublishedAnnouncements(2);
  const recentAnnouncements = announcements;
  const points = one<{ total: number }>("SELECT COALESCE(SUM(points),0) AS total FROM leaderboard_points");
  const verifications = one<{ count: number }>(
    "SELECT COUNT(*) AS count FROM complaints WHERE status IN ('verified','closed')",
  );
  const engagement = one<{ count: number }>(
    "SELECT COUNT(DISTINCT user_id) AS count FROM leaderboard_points",
  );

  const mapCenter = {
    lat: Number(settings.map_center_lat) || SITE.mapCenter.lat,
    lng: Number(settings.map_center_lng) || SITE.mapCenter.lng,
  };

  const rendered: Record<string, React.ReactNode> = {
    hero: (
      <section key="hero" className="relative overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-20">
        <div className="absolute inset-0 grid-eco opacity-40" aria-hidden />
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
        <div className="absolute -right-24 top-32 h-96 w-96 rounded-full bg-forest-500/10 blur-3xl" aria-hidden />
        <div className="container-eco relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <span className="eyebrow">
              <Leaf className="h-3.5 w-3.5" />
              {settings.hero_badge || "Independent campus sustainability initiative"}
            </span>
            <h1 className="heading-1 mt-5 max-w-3xl text-balance">
              {settings.hero_heading || "Let's Make Our Campus Cleaner, Greener & Smarter."}
            </h1>
            <p className="muted mt-5 max-w-xl text-base leading-8 sm:text-lg">
              {settings.hero_description ||
                "An AI-powered platform that helps students and university staff report environmental problems, track solutions and build a sustainable campus."}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/report-problem" className={buttonVariants.primary + " h-12 px-6"}>
                Report a problem <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/campus-map" className={buttonVariants.outline + " h-12 px-6"}>
                <MapPin className="h-4 w-4" /> Explore campus map
              </Link>
            </div>
            <p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-ink-400">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              {SITE.disclaimer}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-ink-500 dark:text-ink-300">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Transparent status timeline
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Role-based access
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600" /> EcoBot AI guidance
              </span>
            </div>
          </div>

          <div className="relative animate-fade-in">
            <div className="relative overflow-hidden rounded-[2rem] border bg-gradient-to-br from-forest-900 via-forest-800 to-emerald-700 p-7 text-white shadow-soft sm:p-9">
              <div className="absolute inset-0 grid-eco opacity-20" aria-hidden />
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/10" aria-hidden />
              <div className="absolute -bottom-16 -left-10 h-52 w-52 rounded-full border border-white/10" aria-hidden />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                    Live campus impact
                  </p>
                  <DemoBadge className="border-white/20 bg-white/10 text-emerald-100" />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-3xl font-semibold tracking-tight">{formatNumber(stats.total)}</p>
                    <p className="mt-1 text-[11px] text-emerald-100/70">Reports recorded</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-3xl font-semibold tracking-tight">{formatNumber(stats.resolved)}</p>
                    <p className="mt-1 text-[11px] text-emerald-100/70">Verified resolutions</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-3xl font-semibold tracking-tight">{formatNumber(points?.total ?? 0)}</p>
                    <p className="mt-1 text-[11px] text-emerald-100/70">Green points earned</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-3xl font-semibold tracking-tight">{formatNumber(stats.pending)}</p>
                    <p className="mt-1 text-[11px] text-emerald-100/70">Awaiting review</p>
                  </div>
                </div>
                <div className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-400/10 p-4">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <p className="text-[11px] leading-5 text-emerald-50/80">
                    Try EcoBot AI in the corner for guidance in English, Hindi or Hinglish — including private
                    status updates for your own reports.
                  </p>
                </div>
                {stats.demo > 0 ? (
                  <p className="mt-4 text-[10px] leading-4 text-emerald-100/50">
                    This workspace currently contains {stats.demo} clearly labelled sample records. Live counts
                    will grow as real reports are submitted.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border bg-white p-3.5 shadow-card dark:bg-[#101f19] sm:block">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Trophy className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Campus community</p>
                  <p className="text-sm font-semibold">{formatNumber(engagement?.count ?? 0)} active contributors</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    ),

    stats: (
      <section key="stats" className="border-y bg-white/60 py-14 dark:bg-white/[0.02]">
        <div className="container-eco">
          <SectionHeading
            eyebrow="Live data"
            title="Live campus environmental statistics"
            description="Counts come directly from platform records. Sample records are labelled as demo data — never presented as real live results."
            action={<Badge tone="amber">{stats.demo} demo record{stats.demo === 1 ? "" : "s"} included</Badge>}
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total reported" value={formatNumber(stats.total)} hint="All time" icon={ClipboardCheck} tone="forest" />
            <StatCard label="Resolved / verified" value={formatNumber(stats.resolved)} hint="Completed the loop" icon={CheckCircle2} />
            <StatCard label="In progress" value={formatNumber(stats.inProgress)} hint="Assigned or being worked on" icon={Building2} tone="sky" />
            <StatCard label="Pending review" value={formatNumber(stats.pending)} hint="Awaiting administrator action" icon={BellRing} tone="amber" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Students registered" value={formatNumber(stats.students)} icon={Users} tone="violet" />
            <StatCard
              label="Water saved"
              value={settings.water_saved_liters ? `${formatNumber(Number(settings.water_saved_liters))} L` : "Not tracked yet"}
              icon={Droplets}
              tone="sky"
              hint="Administrator-entered metric, not an automated sensor reading"
            />
            <StatCard
              label="Energy saved"
              value={settings.energy_saved_kwh ? `${formatNumber(Number(settings.energy_saved_kwh))} kWh` : "Not tracked yet"}
              icon={Zap}
              tone="amber"
              hint="Administrator-entered metric, not an automated sensor reading"
            />
          </div>
        </div>
      </section>
    ),

    recent_issues: (
      <section key="recent_issues" className="py-16 sm:py-20">
        <div className="container-eco">
          <SectionHeading
            eyebrow="Public progress"
            title="Recently reported issues"
            description="Public progress from across the campus. Reporter identities are never shown publicly."
            action={
              <Link href="/track" className={buttonVariants.outline + " h-9 px-4 text-xs"}>
                Track a report <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {recent.length ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recent.map((complaint) => (
                <ComplaintCard key={complaint.id} complaint={complaint} href={`/track?code=${complaint.complaint_code}`} />
              ))}
            </div>
          ) : (
            <div className="surface mt-8 flex flex-col items-center justify-center p-12 text-center">
              <Leaf className="h-8 w-8 text-emerald-600" />
              <h3 className="mt-3 font-display text-lg font-semibold">No issues reported yet</h3>
              <p className="mt-1 max-w-md text-sm text-ink-500">
                Your report can be the first. Sign in and share an environmental problem you have noticed.
              </p>
              <Link href="/report-problem" className={buttonVariants.primary + " mt-5"}>
                Report a problem
              </Link>
            </div>
          )}
        </div>
      </section>
    ),

    how_it_works: (
      <section key="how_it_works" className="border-y bg-forest-950 py-16 text-emerald-50 sm:py-20">
        <div className="container-eco">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
              <Recycle className="h-3 w-3" /> The EcoCampus loop
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              How EcoCampus AI works
            </h2>
            <p className="mt-3 text-sm leading-7 text-emerald-100/60">
              A transparent loop from observation to verified resolution. Every step is recorded and every
              reporter can follow progress.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="font-display text-3xl font-semibold text-white/10">0{index + 1}</span>
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-xs leading-6 text-emerald-100/55">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    map: (
      <section key="map" className="py-16 sm:py-20">
        <div className="container-eco">
          <SectionHeading
            eyebrow="Campus"
            title="Explore the campus map"
            description="Verified locations and reported issue markers. Building pins are added and verified by administrators."
            action={
              <Link href="/campus-map" className={buttonVariants.outline + " h-9 px-4 text-xs"}>
                Open full map <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="mt-8">
            <CampusMap
              locations={locations.map((location) => ({
                id: location.id,
                name: location.name,
                category: location.category,
                building: location.building,
                floor: location.floor,
                description: location.description,
                lat: location.lat ?? 0,
                lng: location.lng ?? 0,
                verified: location.verified,
              }))}
              issues={issues.map((issue) => ({
                id: issue.id,
                code: issue.complaint_code,
                title: issue.title,
                status: issue.status,
                priority: issue.priority,
                category: issue.category,
                lat: issue.lat ?? 0,
                lng: issue.lng ?? 0,
                location: issue.location_name || issue.building || issue.specific_location,
                isDemo: issue.is_demo === 1,
              }))}
              center={mapCenter}
              zoom={15}
              height={430}
              showFilters={false}
            />
            <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-ink-400">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              {settings.map_center_source ||
                "The map is centred on LTSU's official map location. Building-level pins require administrator verification."}
            </p>
          </div>
        </div>
      </section>
    ),

    initiatives: (
      <section key="initiatives" className="border-y bg-emerald-500/[0.04] py-16 sm:py-20">
        <div className="container-eco">
          <SectionHeading
            eyebrow="Get involved"
            title="Sustainability initiatives"
            description="Programmes run through EcoCampus AI. These are platform initiatives, not official university claims."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Droplets, title: "Water wise campus", text: "Report leaks, damaged taps and rainwater harvesting issues before they waste more water." },
              { icon: Zap, title: "Switch off, speak up", text: "Flag electricity wastage in empty rooms and help improve routines across blocks." },
              { icon: Recycle, title: "Segregate better", text: "Report overflowing bins and mixed-waste dumping so collection can be fixed at the source." },
              { icon: Leaf, title: "Protect green areas", text: "Raise tree and sapling damage, irrigation problems and green-space maintenance needs." },
              { icon: Trophy, title: "Green points", text: "Earn recognition for verified reports and completed quizzes — points are confirmed by administrators." },
              { icon: MessageCircleQuestion, title: "Learn with EcoBot", text: "Ask practical questions about waste, energy, water and how to report safely." },
            ].map((item) => (
              <div key={item.title} className="surface group p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-500 dark:text-ink-300">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-white p-5 dark:bg-[#101f19]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">This week&apos;s green challenges</p>
                <p className="mt-1 text-xs text-ink-500">
                  {GREEN_CHALLENGES.slice(0, 3).map((challenge) => challenge.title).join(" · ")}
                </p>
              </div>
              <Link href="/login" className={buttonVariants.soft + " h-9 px-4 text-xs"}>
                Sign in to participate
              </Link>
            </div>
          </div>
        </div>
      </section>
    ),

    awareness: (
      <section key="awareness" className="py-16 sm:py-20">
        <div className="container-eco">
          <SectionHeading
            eyebrow="Knowledge"
            title="Environmental awareness centre"
            description="Practical, campus-friendly knowledge for water, energy, waste and biodiversity."
            action={
              <Link href="/environmental-awareness" className={buttonVariants.outline + " h-9 px-4 text-xs"}>
                Browse all articles <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/environmental-awareness/${article.slug}`}
                className="surface group flex flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="emerald">{article.category}</Badge>
                  <span className="text-[10px] text-ink-400">{article.read_minutes} min read</span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold leading-snug transition group-hover:text-forest-800 dark:group-hover:text-emerald-300">
                  {article.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-ink-500 dark:text-ink-300">
                  {article.excerpt || truncate(article.content, 140)}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-forest-800 dark:text-emerald-300">
                  Read article <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),

    achievements: (
      <section key="achievements" className="border-y bg-white/60 py-16 dark:bg-white/[0.02]">
        <div className="container-eco">
          <SectionHeading
            eyebrow="Milestones"
            title="Platform achievements"
            description="Milestones computed from platform activity. Demo records are included where labelled."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Environmental reports", value: stats.total, icon: ClipboardCheck },
              { label: "Verified resolutions", value: verifications?.count ?? 0, icon: BadgeCheck },
              { label: "Green points awarded", value: points?.total ?? 0, icon: Trophy },
              { label: "Students contributing", value: engagement?.count ?? 0, icon: Users },
            ].map((metric) => (
              <div key={metric.label} className="surface flex items-center gap-4 p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-forest-700 to-emerald-500 text-white">
                  <metric.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-2xl font-semibold">{formatNumber(metric.value)}</p>
                  <p className="text-xs text-ink-500">{metric.label}</p>
                </div>
              </div>
            ))}
          </div>
          {recentAnnouncements.length ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {recentAnnouncements.map((item) => (
                <Link
                  key={item.id}
                  href={`/announcements/${item.slug}`}
                  className="surface group flex items-start gap-3 p-5 transition hover:border-emerald-500/30"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    <BellRing className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                        {item.category}
                      </span>
                      {item.is_demo ? <DemoBadge /> : null}
                      <span className="text-[10px] text-ink-400">{timeAgo(item.created_at)}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold group-hover:text-forest-800 dark:group-hover:text-emerald-300">
                      {item.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-500">{item.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    ),

    contact: (
      <section key="contact" className="py-16 sm:py-20">
        <div className="container-eco">
          <div className="relative overflow-hidden rounded-[2rem] border bg-gradient-to-br from-forest-900 to-forest-800 p-7 text-white sm:p-10">
            <div className="absolute inset-0 grid-eco opacity-20" aria-hidden />
            <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                  Contact & campus information
                </span>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Have a question or spotted an issue?
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-emerald-100/60">
                  Report through EcoCampus AI for a documented, trackable response. For emergencies or immediate
                  safety hazards, contact campus staff or emergency services directly.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/report-problem" className={buttonVariants.secondary + " h-11 px-5"}>
                    Report a problem <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/about" className={buttonVariants.white + " h-11 px-5"}>
                    Learn about the platform
                  </Link>
                </div>
              </div>
              <dl className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-sm">
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/70">Campus</dt>
                    <dd className="mt-0.5 text-emerald-50/80">{settings.address}</dd>
                  </div>
                </div>
                <div className="flex gap-3 border-t border-white/10 pt-3">
                  <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/70">Email</dt>
                    <dd className="mt-0.5">
                      <a href={`mailto:${settings.contact_email}`} className="hover:text-white">
                        {settings.contact_email}
                      </a>
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3 border-t border-white/10 pt-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/70">Phone</dt>
                    <dd className="mt-0.5 text-emerald-50/80">{settings.contact_phone}</dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
    ),
  };

  const enabledSections = sections.filter((section) => section.enabled === 1 && rendered[section.key]);

  return (
    <>
      {enabledSections.map((section) => rendered[section.key])}
      {!isSectionEnabled("contact") ? (
        <section className="container-eco py-16">
          <div className="surface p-8 text-center">
            <p className="text-sm text-ink-500">Contact section is currently disabled by the administrator.</p>
          </div>
        </section>
      ) : null}
    </>
  );
}
