import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { getSessionUser } from "@/lib/auth";
import { getLang, getDictionary } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [user, lang, settings] = await Promise.all([getSessionUser(), getLang(), Promise.resolve(getSettings())]);
  const labels = getDictionary(lang);

  return (
    <div className="flex min-h-dvh flex-col">
      {settings.announcement_banner ? (
        <div className="bg-forest-900 px-4 py-2 text-center text-xs font-medium text-emerald-50">
          {settings.announcement_banner}
        </div>
      ) : null}
      <SiteHeader
        user={user}
        lang={lang}
        labels={labels}
        logoUrl={settings.logo_url || null}
        siteName={settings.site_name || "EcoCampus AI"}
        subtitle={settings.site_subtitle || "Smart Environmental Management System"}
        registrationOpen={settings.registration_open !== "false"}
      />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter settings={settings} labels={labels} lang={lang} />
    </div>
  );
}
