import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, Leaf, Lightbulb, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getArticleBySlug, listPublishedArticles } from "@/lib/content";
import { formatDate, truncate } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Article not found" };
  return {
    title: article.title,
    description: article.excerpt || truncate(article.content, 155),
  };
}

export default async function AwarenessArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const related = (await listPublishedArticles(50))
    .filter((item) => item.slug !== article.slug)
    .sort((a, b) => (a.category === article.category ? -1 : 0) - (b.category === article.category ? -1 : 0))
    .slice(0, 3);

  const paragraphs = article.content.split(/\n\s*\n/).filter(Boolean);

  return (
    <article>
      <header className="relative overflow-hidden border-b py-12 sm:py-16">
        <div className="absolute inset-0 grid-eco opacity-40" aria-hidden />
        <div className="container-eco relative max-w-3xl">
          <Link
            href="/environmental-awareness"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition hover:text-forest-800 dark:text-ink-300 dark:hover:text-emerald-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All awareness articles
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge tone="emerald">{article.category}</Badge>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-400">
              <Clock3 className="h-3.5 w-3.5" /> {article.read_minutes} min read
            </span>
            <span className="text-[11px] text-ink-400">· {formatDate(article.created_at)}</span>
          </div>
          <h1 className="heading-1 mt-4 text-balance">{article.title}</h1>
          {article.excerpt ? (
            <p className="muted mt-4 max-w-2xl text-base leading-8 sm:text-lg">{article.excerpt}</p>
          ) : null}
        </div>
      </header>

      <div className="container-eco grid gap-10 py-12 lg:grid-cols-[1fr_310px]">
        <div className="min-w-0">
          {article.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.image_url}
              alt=""
              className="mb-8 max-h-[380px] w-full rounded-2xl border object-cover"
            />
          ) : null}
          <div className="prose-eco">
            {paragraphs.map((paragraph, index) => {
              const lines = paragraph.split("\n");
              const isHeading = /^[A-Z0-9][A-Z0-9\s&,:()/-]{3,}$/.test(lines[0]?.trim() ?? "");
              return (
                <div key={index}>
                  {isHeading ? (
                    <>
                      <h2>{lines[0]}</h2>
                      {lines.slice(1).join("\n").trim() ? <p>{lines.slice(1).join("\n")}</p> : null}
                    </>
                  ) : (
                    <p>{paragraph}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold">Spotted something that needs attention?</p>
                <p className="mt-0.5 text-xs leading-5 text-ink-500 dark:text-ink-300">
                  Turn this knowledge into action with a trackable environmental report.
                </p>
              </div>
            </div>
            <Link href="/report-problem" className={buttonVariants.primary + " h-10 shrink-0 px-4 text-xs"}>
              Report a problem <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <div className="surface p-5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-emerald-600" /> Put it into practice
            </p>
            <p className="mt-2 text-xs leading-5 text-ink-500 dark:text-ink-300">
              Students can complete quizzes and join verified green activities to earn points on the campus
              leaderboard.
            </p>
            <Link href="/login" className={buttonVariants.soft + " mt-3 h-9 w-full px-4 text-xs"}>
              Open my student portal
            </Link>
          </div>
          <div className="surface p-5">
            <p className="text-sm font-semibold">Keep reading</p>
            <ul className="mt-3 space-y-3">
              {related.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/environmental-awareness/${item.slug}`}
                    className="group flex items-start gap-2.5"
                  >
                    <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      <span className="block text-xs font-semibold leading-5 transition group-hover:text-forest-800 dark:group-hover:text-emerald-300">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-ink-400">
                        {item.category} · {item.read_minutes} min
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </article>
  );
}
