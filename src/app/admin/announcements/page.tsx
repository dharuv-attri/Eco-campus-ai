import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/portal-shell";
import { AnnouncementManager } from "@/components/admin/announcement-manager";
import { requireRole } from "@/lib/auth";
import { all } from "@/lib/db";
import type { Announcement } from "@/lib/content";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  await requireRole(["admin", "super_admin"], "/admin/announcements");
  const announcements = await all<Announcement>("SELECT * FROM announcements ORDER BY created_at DESC");

  return (
    <>
      <PageHeader
        eyebrow="Communications"
        title="Announcements"
        description="Publish campus updates, awareness campaign results and platform notices. Drafts stay hidden from the public site."
      />
      <AnnouncementManager announcements={announcements} />
    </>
  );
}
