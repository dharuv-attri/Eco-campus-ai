import type { MetadataRoute } from "next";
import { listPublishedAnnouncements, listPublishedArticles } from "@/lib/content";

function normalizeBaseUrl(raw?: string) {
  const candidate = raw?.trim().replace(/\/+$/, "");
  if (!candidate) return "";

  if (/^https?:\/\//i.test(candidate)) {
    try {
      return new URL(candidate).origin;
    } catch {
      return candidate;
    }
  }

  if (/^[a-z0-9.-]+(?::\d+)?$/i.test(candidate)) {
    return `https://${candidate}`;
  }

  return candidate;
}

function baseUrl() {
  const configured =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeBaseUrl(process.env.VERCEL_URL) ||
    normalizeBaseUrl(process.env.RENDER_EXTERNAL_URL) ||
    "http://localhost:3000";

  return configured.replace(/\/$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const now = new Date();
  const staticPages = [
    "",
    "/about",
    "/report-problem",
    "/campus-map",
    "/environmental-awareness",
    "/announcements",
    "/track",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: (path === "" ? "daily" : "weekly") as "daily" | "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  let articles: MetadataRoute.Sitemap = [];
  let announcements: MetadataRoute.Sitemap = [];
  try {
    articles = (await listPublishedArticles(200)).map((article) => ({
      url: `${base}/environmental-awareness/${article.slug}`,
      lastModified: new Date(article.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
    announcements = (await listPublishedAnnouncements(200)).map((announcement) => ({
      url: `${base}/announcements/${announcement.slug}`,
      lastModified: new Date(announcement.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // The sitemap should still resolve if the database is unavailable during build.
  }

  return [...staticPages, ...articles, ...announcements];
}
