import Link from "next/link";
import { Instagram, Linkedin, Youtube, Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import { Brand } from "@/components/brand";
import { SITE } from "@/lib/constants";
import type { Lang } from "@/lib/i18n";

export function SiteFooter({
  settings,
  labels,
  lang,
}: {
  settings: Record<string, string>;
  labels: Record<string, string>;
  lang: Lang;
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t bg-forest-950 text-emerald-50/80">
      <div className="container-eco grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Brand
            name={settings.site_name || "EcoCampus AI"}
            subtitle={settings.site_subtitle || "Smart Environmental Management System"}
            logoUrl={settings.logo_url || null}
          />
          <p className="mt-4 max-w-xs text-sm leading-6 text-emerald-100/60">
            {settings.tagline || SITE.tagline}
          </p>
          <div className="mt-5 flex gap-2">
            {settings.social_instagram ? (
              <a
                href={settings.social_instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white/5 p-2 transition hover:bg-white/10"
                aria-label="University Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            ) : null}
            {settings.social_linkedin ? (
              <a
                href={settings.social_linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white/5 p-2 transition hover:bg-white/10"
                aria-label="University LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            ) : null}
            {settings.social_youtube ? (
              <a
                href={settings.social_youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white/5 p-2 transition hover:bg-white/10"
                aria-label="University YouTube"
              >
                <Youtube className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Platform</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              ["/report-problem", labels["nav.report"]],
              ["/campus-map", labels["nav.map"]],
              ["/environmental-awareness", labels["nav.awareness"]],
              ["/announcements", labels["nav.announcements"]],
              ["/login", labels["nav.login"]],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="transition hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
            {lang === "hi" ? "विश्वविद्यालय" : "University"}
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a href={SITE.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-white">
                Official LTSU website <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              <a href="https://www.ltsu.ac.in/about-ltsu" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
                About LTSU
              </a>
            </li>
            <li>
              <a href="https://www.ltsu.ac.in/how-to-reach-ltsu" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
                How to reach campus
              </a>
            </li>
            <li>
              <a href="https://www.ltsu.ac.in/contact-us" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
                Official contact page
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
            {lang === "hi" ? "संपर्क" : "Campus contact"}
          </h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <span className="leading-6 text-emerald-100/70">{settings.address}</span>
            </li>
            <li>
              <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2.5 hover:text-white">
                <Mail className="h-4 w-4 text-emerald-300" />
                {settings.contact_email}
              </a>
            </li>
            <li>
              <a href={`tel:${(settings.contact_phone || "").replace(/[^+\d]/g, "")}`} className="flex items-center gap-2.5 hover:text-white">
                <Phone className="h-4 w-4 text-emerald-300" />
                {settings.contact_phone}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-eco flex flex-col gap-3 py-5 text-xs text-emerald-100/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {settings.site_name || "EcoCampus AI"} · {labels["footer.disclaimer"]}
          </p>
          <p className="max-w-xl md:text-right">{settings.footer_text}</p>
        </div>
      </div>
    </footer>
  );
}
