import type { MetadataRoute } from "next";

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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/report-problem", "/campus-map", "/environmental-awareness", "/announcements", "/track"],
        disallow: ["/api/", "/admin/", "/staff/", "/student/", "/uploads/", "/reset-password", "/verify-email"],
      },
    ],
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
