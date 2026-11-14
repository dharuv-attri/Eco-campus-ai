import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { ComplaintProgress, ComplaintTimeline } from "@/components/complaints/timeline";
import { PriorityBadge, StatusBadge, DemoBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input, Label, FieldHint } from "@/components/ui/form";
import { getComplaintByCode } from "@/lib/complaints";
import { SITE } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Track a report",
  description:
    "Enter your EcoCampus AI tracking code to see the public status and progress timeline of an environmental report.",
};

function normaliseCode(raw: string) {
  const value = raw.trim().toUpperCase();
  if (!value) return "";
  if (/^\d{1,5}$/.test(value)) {
    return `ECO-${new Date().getFullYear()}-${value.padStart(5, "0")}`;
  }
  const compact = value.match(/^ECO-?(\d{4})-?(\d{1,5})$/);
  if (compact) return `ECO-${compact[1]}-${compact[2].padStart(5, "0")}`;
  return value;
}

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = rawCode ? normaliseCode(rawCode) : "";
  const complaint = code ? await getComplaintByCode(code) : null;

  const publicHistory = complaint
    ? complaint.history.map((item) => ({ ...item, changed_by_name: null }))
    : [];
  const publicUpdates = complaint
    ? complaint.staff_updates.map((item) => ({ ...item, staff_name: null }))
    : [];
  const resolutionImages = complaint
    ? complaint.images.filter((image) => image.kind === "resolution")
    : [];

  return (
    <div className="relative overflow-hidden py-12 sm:py-16">
      <div className="absolute inset-x-0 top-0 h-80 grid-eco opacity-40" aria-hidden />
      <div className="container-eco relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow">
            <Search className="h-3.5 w-3.5" /> Public report tracking
          </span>
          <h1 className="heading-1 mt-4 text-balance">Follow a report from start to finish.</h1>
          <p className="muted mx-auto mt-4 max-w-2xl text-base leading-8">
            Enter the tracking code you received when submitting a report. Public tracking shows status and
            timeline updates without exposing reporter identities.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-xl">
          <form action="/track" method="get" className="surface p-4 sm:p-5">
            <Label htmlFor="track-code">Tracking code</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="track-code"
                name="code"
                defaultValue={rawCode ?? ""}
                placeholder="ECO-2026-00001"
                autoComplete="off"
                className="font-mono uppercase tracking-wide"
                aria-describedby="track-code-hint"
                required
              />
              <button type="submit" className={buttonVariants.primary + " shrink-0"}>
                <Search className="h-4 w-4" /> Track report
              </button>
            </div>
            <FieldHint id="track-code-hint">
              Codes look like ECO-2026-00001. You can also enter the five-digit number.
            </FieldHint>
          </form>
        </div>

        {code && !complaint ? (
          <div className="surface mx-auto mt-8 max-w-2xl p-6 text-center sm:p-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <TriangleAlert className="h-7 w-7" />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold">No report found for {code}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500 dark:text-ink-300">
              Check that the code is complete and matches the one shown after submission. Rejected or deleted
              reports may no longer be publicly trackable.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Link href="/report-problem" className={buttonVariants.primary + " h-10 px-4 text-xs"}>
                Report a problem <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/login" className={buttonVariants.outline + " h-10 px-4 text-xs"}>
                Sign in for your portal
              </Link>
            </div>
          </div>
        ) : null}

        {complaint ? (
          <div className="mx-auto mt-8 max-w-4xl space-y-5">
            <section className="surface overflow-hidden">
              <div className="border-b bg-emerald-500/[0.045] p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={complaint.status} />
                  <PriorityBadge priority={complaint.priority} />
                  {complaint.is_demo ? <DemoBadge /> : null}
                  <span className="ml-auto font-mono text-[11px] text-ink-400">{complaint.complaint_code}</span>
                </div>
                <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">{complaint.title}</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink-600 dark:text-ink-200">
                  {complaint.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-500 dark:text-ink-400">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    {[complaint.location_name, complaint.building, complaint.floor, complaint.room_number]
                      .filter(Boolean)
                      .join(" · ") || complaint.specific_location || "Campus location"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" /> Submitted {formatDateTime(complaint.created_at)}
                  </span>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <ComplaintProgress status={complaint.status} />
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
              <section className="surface p-5 sm:p-6">
                <h3 className="font-display text-base font-semibold">Progress timeline</h3>
                <p className="mt-1 text-xs text-ink-500">
                  Public updates are shown without the names of reporters or internal staff.
                </p>
                <ComplaintTimeline
                  className="mt-5"
                  history={publicHistory}
                  staffUpdates={publicUpdates}
                />
              </section>

              <aside className="space-y-4">
                <div className="surface p-5">
                  <h3 className="text-sm font-semibold">Report details</h3>
                  <dl className="mt-3 space-y-2.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-400">Category</dt>
                      <dd className="text-right font-medium">{complaint.category.replaceAll("_", " ")}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-400">Department</dt>
                      <dd className="text-right font-medium">{complaint.department_name || "Not assigned yet"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-400">Last update</dt>
                      <dd className="text-right font-medium">{formatDateTime(complaint.updated_at)}</dd>
                    </div>
                    {complaint.verified_at ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-400">Verified</dt>
                        <dd className="text-right font-medium">{formatDateTime(complaint.verified_at)}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {complaint.rejection_reason ? (
                    <p className="mt-3 rounded-xl bg-rose-500/[0.06] p-3 text-[11px] leading-5 text-rose-700 dark:text-rose-300">
                      Rejection reason: {complaint.rejection_reason}
                    </p>
                  ) : null}
                  {complaint.resolution_notes ? (
                    <div className="mt-3 rounded-xl bg-emerald-500/[0.06] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                        Resolution notes
                      </p>
                      <p className="mt-1 whitespace-pre-line text-[11px] leading-5 text-emerald-900/80 dark:text-emerald-100/80">
                        {complaint.resolution_notes}
                      </p>
                    </div>
                  ) : null}
                </div>

                {resolutionImages.length ? (
                  <div className="surface p-5">
                    <h3 className="text-sm font-semibold">Resolution evidence</h3>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {resolutionImages.map((image) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={image.id}
                          src={image.url}
                          alt="Resolution evidence"
                          className="aspect-square w-full rounded-xl border object-cover"
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Reported through EcoCampus AI
                  </p>
                  <p className="mt-1.5 text-[11px] leading-5 text-emerald-800/70 dark:text-emerald-200/70">
                    Want private access to your own reports, notifications and feedback? Sign in to your portal.
                  </p>
                  <Link href="/login" className={buttonVariants.primary + " mt-3 h-9 px-4 text-xs"}>
                    Sign in
                  </Link>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4 text-[11px] leading-5 text-amber-800 dark:text-amber-200">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" /> Independent platform
                  </p>
                  <p className="mt-1">{SITE.disclaimer}</p>
                </div>
              </aside>
            </div>

            <div className="surface flex flex-col items-center justify-between gap-3 p-5 text-center sm:flex-row sm:text-left">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <ClipboardList className="h-4 w-4 text-emerald-600" /> Spotted another environmental problem?
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  A precise report with a photo helps the campus team act faster.
                </p>
              </div>
              <Link href="/report-problem" className={buttonVariants.primary + " shrink-0"}>
                Report a problem <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : null}

        {!code ? (
          <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
            {[
              { title: "Public status", text: "See the current stage and full status timeline." },
              { title: "Private identity", text: "Reporter names and contact details are never exposed." },
              { title: "Verified evidence", text: "Resolution photos appear after staff upload them." },
            ].map((item) => (
              <div key={item.title} className="surface p-4">
                <p className="text-xs font-semibold">{item.title}</p>
                <p className="mt-1 text-[11px] leading-5 text-ink-500">{item.text}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
