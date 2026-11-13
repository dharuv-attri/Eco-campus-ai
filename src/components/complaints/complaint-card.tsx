import Link from "next/link";
import { Clock, ImageIcon, MapPin, Star, UserRound } from "lucide-react";
import { PriorityBadge, StatusBadge, DemoBadge } from "@/components/ui/badge";
import { categoryLabel, cn, timeAgo } from "@/lib/utils";
import type { Complaint } from "@/types";

type CardComplaint = Complaint & {
  reporter_name?: string | null;
  rating?: number | null;
  anonymous?: number;
};

export function ComplaintCard({
  complaint,
  href,
  showReporter = false,
  showImageCount = true,
  className,
}: {
  complaint: CardComplaint;
  href?: string;
  showReporter?: boolean;
  showImageCount?: boolean;
  className?: string;
}) {
  const location = complaint.location_name || complaint.building || complaint.specific_location || "Location not specified";

  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={complaint.status} />
        <PriorityBadge priority={complaint.priority} />
        {complaint.is_demo ? <DemoBadge /> : null}
        <span className="ml-auto font-mono text-[11px] text-ink-400">{complaint.complaint_code}</span>
      </div>
      <h3 className="mt-3 font-display text-base font-semibold leading-snug tracking-tight text-ink-900 transition group-hover:text-forest-800 dark:text-white dark:group-hover:text-emerald-300">
        {complaint.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-ink-500 dark:text-ink-300">
        {complaint.description}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-500 dark:text-ink-400">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="line-clamp-1 max-w-[220px]">{location}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {timeAgo(complaint.created_at)}
        </span>
        {showImageCount && complaint.image_count ? (
          <span className="inline-flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            {complaint.image_count} photo{complaint.image_count === 1 ? "" : "s"}
          </span>
        ) : null}
        {showReporter ? (
          <span className="inline-flex items-center gap-1.5">
            {complaint.anonymous === 1 ? <UserRound className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
            {complaint.anonymous === 1 ? "Anonymous" : complaint.reporter_name || "Campus member"}
          </span>
        ) : null}
        {complaint.rating ? (
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {complaint.rating}/5
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
        <span className="rounded-full bg-emerald-500/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
          {categoryLabel(complaint.category)}
        </span>
        {href ? (
          <span className="text-[11px] font-semibold text-forest-800 transition group-hover:translate-x-0.5 dark:text-emerald-300">
            View details →
          </span>
        ) : null}
      </div>
    </>
  );

  return href ? (
    <Link
      href={href}
      className={cn(
        "surface group block p-5 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-glow",
        className,
      )}
    >
      {inner}
    </Link>
  ) : (
    <div className={cn("surface group p-5", className)}>{inner}</div>
  );
}
