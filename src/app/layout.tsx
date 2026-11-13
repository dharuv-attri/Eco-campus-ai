import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { EcoBot } from "@/components/ecobot";
import { getSettings } from "@/lib/settings";
import { safeColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = getSettings();
  const siteName = settings.site_name || "EcoCampus AI";
  const description =
    settings.hero_description ||
    "Report, track and resolve environmental problems at Lamrin Tech Skills University Punjab.";
  return {
    title: {
      default: `${siteName} — ${settings.site_subtitle || "Smart Environmental Management System"}`,
      template: `%s · ${siteName}`,
    },
    description,
    applicationName: siteName,
    keywords: [
      "EcoCampus AI",
      "Lamrin Tech Skills University",
      "LTSU Punjab",
      "environmental reporting",
      "campus sustainability",
      "water conservation",
      "waste management",
    ],
    authors: [{ name: "EcoCampus AI" }],
    openGraph: {
      title: `${siteName} — ${settings.tagline || ""}`,
      description,
      type: "website",
      siteName,
    },
    icons: settings.favicon_url
      ? { icon: settings.favicon_url, shortcut: settings.favicon_url, apple: settings.favicon_url }
      : { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    manifest: "/manifest.webmanifest",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#14532D" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1410" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = getSettings();
  const brand = safeColor(settings.primary_color, "#14532D");
  const accent = safeColor(settings.secondary_color, "#10B981");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`:root{--brand:${brand};--brand-accent:${accent};}`}</style>
      </head>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-forest-800 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Providers>
          {children}
          <EcoBot siteName={settings.site_name || "EcoCampus AI"} />
        </Providers>
      </body>
    </html>
  );
}
