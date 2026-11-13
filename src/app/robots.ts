import type { MetadataRoute } from "next";

function baseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return configured || "http://localhost:3000";
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
