import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/portal-shell";
import { NotificationsView } from "@/components/portal/notifications-view";
import { requireRole } from "@/lib/auth";
import { listUserNotifications } from "@/lib/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function StaffNotificationsPage() {
  const user = await requireRole(["staff"], "/staff/notifications");
  const notifications = await listUserNotifications(user.id);
  return (
    <>
      <PageHeader
        eyebrow="Updates"
        title="Notifications"
        description="New assignments, reporter feedback, verification outcomes and status changes."
      />
      <NotificationsView notifications={notifications} detailBase="/staff/tasks" />
    </>
  );
}
