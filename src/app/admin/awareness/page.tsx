import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/portal-shell";
import { ArticleManager } from "@/components/admin/article-manager";
import { requireRole } from "@/lib/auth";
import { all } from "@/lib/db";
import type { Article } from "@/lib/content";

export const metadata: Metadata = { title: "Awareness articles" };

export default async function AdminAwarenessPage() {
  await requireRole(["admin", "super_admin"], "/admin/awareness");
  const articles = all<Article>("SELECT * FROM environmental_articles ORDER BY created_at DESC");

  return (
    <>
      <PageHeader
        eyebrow="Education"
        title="Environmental awareness"
        description="Publish practical guides on water, energy, waste, biodiversity, transport and campus sustainability. Only published articles appear publicly."
      />
      <ArticleManager articles={articles} />
    </>
  );
}
