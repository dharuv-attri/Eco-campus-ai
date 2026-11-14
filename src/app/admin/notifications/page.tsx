import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/portal-shell";
import { NotificationsView } from "@/components/portal/notifications-view";
import { requireRole } from "@/lib/auth";
import { listUserNotifications } from "@/lib/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  const user = await requireRole(["admin", "super_admin"], "/admin/notifications");
  const notifications = await listUserNotifications(user.id);

  return (
    <>
      <PageHeader
        eyebrow="Updates"
        title="Notifications"
        description="Resolution requests, staff information requests, new reports and platform security alerts."
      />
      <NotificationsView notifications={notifications} detailBase="/admin/complaints" />
    </>
  );
}
