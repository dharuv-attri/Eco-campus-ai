import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ImageIcon,
  MapPin,
  MessageSquare,
  Star,
  UserRound,
  Wrench,
} from "lucide-react";
import { ComplaintProgress, ComplaintTimeline } from "@/components/complaints/timeline";
import { Badge, DemoBadge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { categoryLabel, formatDateTime } from "@/lib/utils";
import type { FullComplaint } from "@/types";

export function ComplaintDetailView({
  complaint,
  backHref,
  backLabel,
  showPrivateDetails = true,
  actions,
}: {
  complaint: FullComplaint;
  backHref: string;
  backLabel: string;
  showPrivateDetails?: boolean;
  actions?: React.ReactNode;
}) {
  const reportImages = complaint.images.filter((image) => image.kind === "report");
  const resolutionImages = complaint.images.filter((image) => image.kind === "resolution");
  const locationText =
    [complaint.location_name, complaint.building, complaint.floor, complaint.room_number, complaint.specific_location]
      .filter(Boolean)
      .join(" · ") || "Campus location";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition hover:text-forest-800 dark:text-ink-300 dark:hover:text-emerald-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
        </Link>
        {showPrivateDetails ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-medium text-ink-500 dark:bg-white/5 dark:text-ink-300">
            <UserRound className="h-3 w-3" />
            {complaint.anonymous === 1 ? "Anonymous to other users" : complaint.reporter_name || "Campus member"}
          </span>
        ) : null}
      </div>

      <section className="surface overflow-hidden">
        <div className="border-b bg-emerald-500/[0.045] p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
            {complaint.is_demo ? <DemoBadge /> : null}
            <span className="ml-auto font-mono text-[11px] text-ink-400">{complaint.complaint_code}</span>
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{complaint.title}</h1>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink-600 dark:text-ink-200">
            {complaint.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-500 dark:text-ink-400">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" /> {locationText}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" /> Submitted {formatDateTime(complaint.created_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" /> {categoryLabel(complaint.category)}
            </span>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <ComplaintProgress status={complaint.status} />
        </div>
      </section>

      {actions ? <div className="space-y-5">{actions}</div> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {reportImages.length ? (
            <section className="surface p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <ImageIcon className="h-4 w-4 text-emerald-600" /> Photos attached to the report
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {reportImages.map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a
                    key={image.id}
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-xl border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt="Report evidence"
                      className="aspect-square w-full object-cover transition duration-300 hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <section className="surface p-5 sm:p-6">
            <h2 className="font-display text-base font-semibold">Progress timeline</h2>
            <p className="mt-1 text-xs text-ink-500">
              Every status change and staff update is recorded with a timestamp.
            </p>
            <ComplaintTimeline className="mt-5" history={complaint.history} staffUpdates={complaint.staff_updates} />
          </section>

          {complaint.assignments?.length ? (
            <section className="surface p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <Wrench className="h-4 w-4 text-emerald-600" /> Assignment history
              </h2>
              <ul className="mt-4 space-y-3">
                {complaint.assignments.map((assignment) => (
                  <li key={assignment.id} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {assignment.department_name || "Department removed"}
                        {assignment.staff_name ? ` · ${assignment.staff_name}` : ""}
                      </p>
                      <span className="text-[10px] text-ink-400">{formatDateTime(assignment.created_at)}</span>
                    </div>
                    {assignment.note ? (
                      <p className="mt-1 text-[11px] leading-5 text-ink-500 dark:text-ink-300">{assignment.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="surface p-5">
            <h2 className="text-sm font-semibold">Report details</h2>
            <dl className="mt-3 space-y-2.5 text-xs">
              <DetailRow label="Status" value={complaint.status.replaceAll("_", " ")} />
              <DetailRow label="Priority" value={complaint.priority} />
              <DetailRow label="Category" value={categoryLabel(complaint.category)} />
              <DetailRow label="Department" value={complaint.department_name || "Not assigned yet"} />
              <DetailRow label="Staff" value={complaint.staff_name || "Not assigned yet"} />
              <DetailRow label="Last update" value={formatDateTime(complaint.updated_at)} />
              {complaint.resolved_at ? <DetailRow label="Resolved" value={formatDateTime(complaint.resolved_at)} /> : null}
              {complaint.verified_at ? <DetailRow label="Verified" value={formatDateTime(complaint.verified_at)} /> : null}
              {complaint.closed_at ? <DetailRow label="Closed" value={formatDateTime(complaint.closed_at)} /> : null}
            </dl>
            {complaint.anonymous === 1 && showPrivateDetails ? (
              <p className="mt-3 rounded-xl bg-ink-50 p-3 text-[11px] leading-5 text-ink-500 dark:bg-white/5 dark:text-ink-300">
                The reporter chose to hide their name from public and community views. Authorized staff and
                administrators can still see the account for follow-up.
              </p>
            ) : null}
          </div>

          {showPrivateDetails && complaint.reporter_email ? (
            <div className="surface p-5">
              <h2 className="text-sm font-semibold">Reporter</h2>
              <p className="mt-2 text-sm font-medium">{complaint.reporter_name || "Campus member"}</p>
              <p className="text-[11px] text-ink-500">{complaint.reporter_email}</p>
              <p className="mt-2 text-[10px] leading-4 text-ink-400">
                Visible only to authorized staff and administrators for follow-up.
              </p>
            </div>
          ) : null}

          {complaint.rejection_reason ? (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] p-4">
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">Rejection reason</p>
              <p className="mt-1 text-[11px] leading-5 text-rose-700/80 dark:text-rose-200/80">
                {complaint.rejection_reason}
              </p>
            </div>
          ) : null}

          {complaint.resolution_notes ? (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Resolution notes
              </p>
              <p className="mt-1 whitespace-pre-line text-[11px] leading-5 text-emerald-900/80 dark:text-emerald-100/80">
                {complaint.resolution_notes}
              </p>
            </div>
          ) : null}

          {resolutionImages.length ? (
            <div className="surface p-5">
              <h2 className="text-sm font-semibold">Resolution evidence</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {resolutionImages.map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt="Resolution evidence"
                      className="aspect-square w-full rounded-xl border object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {complaint.feedback ? (
            <div className="surface p-5">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <BadgeCheck className="h-4 w-4 text-emerald-600" /> Reporter feedback
              </h2>
              <div className="mt-2 flex items-center gap-0.5" aria-label={`${complaint.feedback.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={
                      star <= (complaint.feedback?.rating ?? 0)
                        ? "h-4 w-4 fill-amber-400 text-amber-400"
                        : "h-4 w-4 text-ink-300"
                    }
                  />
                ))}
                <span className="ml-1 text-xs font-semibold">{complaint.feedback.rating}/5</span>
              </div>
              {complaint.feedback.comment ? (
                <p className="mt-2 text-[11px] leading-5 text-ink-500 dark:text-ink-300">
                  <MessageSquare className="mr-1 inline h-3 w-3" />
                  {complaint.feedback.comment}
                </p>
              ) : null}
              <p className="mt-2 text-[10px] text-ink-400">{formatDateTime(complaint.feedback.created_at)}</p>
            </div>
          ) : null}

          {complaint.admin_notes ? (
            <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.05] p-4">
              <p className="text-xs font-semibold text-violet-800 dark:text-violet-300">Internal admin notes</p>
              <p className="mt-1 whitespace-pre-line text-[11px] leading-5 text-violet-900/75 dark:text-violet-200/75">
                {complaint.admin_notes}
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-400">{label}</dt>
      <dd className="text-right font-medium capitalize">{value}</dd>
    </div>
  );
}
