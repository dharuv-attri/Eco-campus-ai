import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight, Clock3, Leaf, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/misc";
import { listPublishedArticles } from "@/lib/content";
import { cn, truncate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Environmental awareness",
  description:
    "Practical guidance on water, energy, waste, biodiversity and sustainable transport for the campus community.",
};

const categories = ["All", "Water", "Energy", "Waste", "Air", "Plastic", "Biodiversity", "Transport", "Noise"];

export default async function AwarenessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selected = typeof params.category === "string" ? params.category : "All";
  const articles = listPublishedArticles(50);
  const visible = selected === "All" ? articles : articles.filter((article) => article.category === selected);

  return (
    <>
      <section className="border-b py-12 sm:py-16">
        <div className="container-eco">
          <SectionHeading
            eyebrow="Knowledge centre"
            title="Environmental awareness"
            description="Practical, campus-friendly knowledge for water, energy, waste and biodiversity. Read an article, then put it into action."
            action={
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-forest-800 transition hover:bg-emerald-500/15 dark:text-emerald-300"
              >
                <Sparkles className="h-3.5 w-3.5" /> Take a student quiz
              </Link>
            }
          />
          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category}
                href={category === "All" ? "/environmental-awareness" : `/environmental-awareness?category=${encodeURIComponent(category)}`}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                  selected === category
                    ? "border-emerald-500/30 bg-emerald-500/10 text-forest-800 dark:text-emerald-300"
                    : "text-ink-500 hover:border-emerald-500/30 hover:text-forest-800 dark:text-ink-300",
                )}
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-eco">
          {visible.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((article) => (
                <Link
                  key={article.id}
                  href={`/environmental-awareness/${article.slug}`}
                  className="surface group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-glow"
                >
                  <div className="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-forest-800 to-emerald-600">
                    <div className="absolute inset-0 grid-eco opacity-20" aria-hidden />
                    <Leaf className="relative h-10 w-10 text-white/60" />
                    <Badge tone="emerald" className="absolute left-4 top-4 border-white/20 bg-white/15 text-white">
                      {article.category}
                    </Badge>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-display text-lg font-semibold leading-snug transition group-hover:text-forest-800 dark:group-hover:text-emerald-300">
                      {article.title}
                    </h2>
                    <p className="mt-2 flex-1 text-sm leading-6 text-ink-500 dark:text-ink-300">
                      {article.excerpt || truncate(article.content, 150)}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-[11px] text-ink-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" /> {article.read_minutes} min read
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-forest-800 dark:text-emerald-300">
                        Read <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="surface flex flex-col items-center justify-center p-12 text-center">
              <BookOpen className="h-8 w-8 text-emerald-600" />
              <h2 className="mt-3 font-display text-lg font-semibold">No articles in this category</h2>
              <p className="mt-1 text-sm text-ink-500">Try another category or browse all awareness articles.</p>
              <Link href="/environmental-awareness" className="mt-4 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                Browse all articles
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
