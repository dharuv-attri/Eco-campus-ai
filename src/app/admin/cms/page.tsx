import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { CmsEditor } from "@/components/admin/cms-editor";
import { requireRole } from "@/lib/auth";
import { getSections, getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Website CMS" };

export default async function AdminCmsPage() {
  await requireRole(["admin", "super_admin"], "/admin/cms");
  const settings = await getSettings();
  const sections = await getSections();

  return (
    <>
      <PageHeader
        eyebrow="Public site"
        title="Website content & branding"
        description="Edit homepage text, images, theme metadata, contact details and the order of public sections. Changes publish immediately after saving."
        action={
          <Link
            href="/"
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition hover:border-emerald-500/40 hover:bg-emerald-500/5"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Live preview
          </Link>
        }
      />
      <p className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 text-[11px] leading-5 text-amber-800 dark:text-amber-200">
        Keep the independent-platform disclaimer accurate. Do not present EcoCampus AI as an official university
        service, and only publish statistics, images or claims you can verify.
      </p>
      <CmsEditor initialSettings={settings} initialSections={sections} />
    </>
  );
}
