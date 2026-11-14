import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CalendarDays, ChevronRight } from "lucide-react";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/misc";
import { listPublishedAnnouncements } from "@/lib/content";
import { formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Announcements",
  description: "Platform announcements, campus environmental updates and verified initiative notices.",
};

export default async function AnnouncementsPage() {
  const announcements = await listPublishedAnnouncements(50);

  return (
    <>
      <section className="border-b py-12 sm:py-16">
        <div className="container-eco">
          <SectionHeading
            eyebrow="Noticeboard"
            title="Announcements"
            description="Platform updates and environmental notices published by the campus administration team. Demo notices are labelled."
          />
        </div>
      </section>

      <section className="py-12">
        <div className="container-eco">
          {announcements.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {announcements.map((item) => (
                <Link
                  key={item.id}
                  href={`/announcements/${item.slug}`}
                  className="surface group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-glow sm:p-6"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="amber">{item.category}</Badge>
                    {item.is_demo ? <DemoBadge /> : null}
                    <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-ink-400">
                      <CalendarDays className="h-3 w-3" /> {formatDate(item.created_at)}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-lg font-semibold leading-snug transition group-hover:text-forest-800 dark:group-hover:text-emerald-300">
                    {item.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-ink-500 dark:text-ink-300">
                    {item.excerpt || truncate(item.content, 180)}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 border-t pt-3 text-[11px] font-semibold text-forest-800 dark:text-emerald-300">
                    Read announcement
                    <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="surface flex flex-col items-center p-12 text-center">
              <BellRing className="h-8 w-8 text-emerald-600" />
              <h2 className="mt-3 font-display text-lg font-semibold">No announcements yet</h2>
              <p className="mt-1 max-w-md text-sm text-ink-500">
                Platform announcements will appear here after an administrator publishes them.
              </p>
              <Link
                href="/environmental-awareness"
                className="mt-4 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
              >
                Browse environmental awareness articles
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
