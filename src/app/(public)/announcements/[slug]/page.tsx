import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BellRing, CalendarDays } from "lucide-react";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { getAnnouncementBySlug, listPublishedAnnouncements } from "@/lib/content";
import { formatDateTime } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const announcement = await getAnnouncementBySlug(slug);
  if (!announcement) return { title: "Announcement not found" };
  return { title: announcement.title, description: announcement.excerpt || undefined };
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const announcement = await getAnnouncementBySlug(slug);
  if (!announcement) notFound();

  const others = (await listPublishedAnnouncements(10))
    .filter((item) => item.id !== announcement.id)
    .slice(0, 4);
  const paragraphs = announcement.content.split(/\n\s*\n/).filter(Boolean);

  return (
    <article className="container-eco max-w-4xl py-12 sm:py-16">
      <Link
        href="/announcements"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition hover:text-forest-800 dark:text-ink-300 dark:hover:text-emerald-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All announcements
      </Link>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge tone="amber">{announcement.category}</Badge>
        {announcement.is_demo ? <DemoBadge /> : null}
        <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-400">
          <CalendarDays className="h-3.5 w-3.5" /> {formatDateTime(announcement.created_at)}
        </span>
      </div>
      <h1 className="heading-2 mt-4 text-balance">{announcement.title}</h1>
      {announcement.excerpt ? (
        <p className="muted mt-3 text-base leading-8">{announcement.excerpt}</p>
      ) : null}

      <div className="prose-eco mt-8 border-t pt-8">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <BellRing className="h-4 w-4 text-emerald-600" /> Stay informed
        </p>
        <p className="mt-1 text-xs leading-5 text-ink-500 dark:text-ink-300">
          Signed-in students and staff receive notifications about reports, assignments and resolutions in
          their portal.
        </p>
      </div>

      {others.length ? (
        <div className="mt-10 border-t pt-8">
          <h2 className="font-display text-lg font-semibold">More announcements</h2>
          <ul className="mt-4 divide-y">
            {others.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/announcements/${item.slug}`}
                  className="group flex items-center justify-between gap-4 py-3"
                >
                  <span className="text-sm font-medium transition group-hover:text-forest-800 dark:group-hover:text-emerald-300">
                    {item.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-ink-400">{formatDateTime(item.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
