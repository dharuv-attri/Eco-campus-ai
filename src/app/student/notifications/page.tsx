import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/portal-shell";
import { NotificationsView } from "@/components/portal/notifications-view";
import { requireRole } from "@/lib/auth";
import { listUserNotifications } from "@/lib/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function StudentNotificationsPage() {
  const user = await requireRole(["student"], "/student/notifications");
  const notifications = listUserNotifications(user.id);
  return (
    <>
      <PageHeader
        eyebrow="Updates"
        title="Notifications"
        description="Status changes, staff updates, feedback and green points for your reports."
      />
      <NotificationsView notifications={notifications} detailBase="/student/reports" />
    </>
  );
}
