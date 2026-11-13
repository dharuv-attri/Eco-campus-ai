import type { MetadataRoute } from "next";
import { listPublishedAnnouncements, listPublishedArticles } from "@/lib/content";

function baseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return configured || "http://localhost:3000";
}

export default function sitemap(): MetadataRoute.Sitemap {
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
    articles = listPublishedArticles(200).map((article) => ({
      url: `${base}/environmental-awareness/${article.slug}`,
      lastModified: new Date(article.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
    announcements = listPublishedAnnouncements(200).map((announcement) => ({
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
