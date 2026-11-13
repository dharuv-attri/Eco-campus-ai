import { PortalShell } from "@/components/portal/portal-shell";
import { requireRole } from "@/lib/auth";
import { one } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["staff"], "/staff/dashboard");
  const settings = getSettings();
  const unread =
    one<{ count: number }>("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0", user.id)
      ?.count ?? 0;

  return (
    <PortalShell
      user={user}
      siteName={settings.site_name}
      subtitle={settings.site_subtitle}
      unread={unread}
      nav={[
        { href: "/staff/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: "/staff/tasks", label: "Assigned work", icon: "tasks" },
        { href: "/staff/reports", label: "My reports", icon: "reports" },
        { href: "/staff/notifications", label: "Notifications", icon: "bell", badge: unread },
        { href: "/staff/profile", label: "My profile", icon: "user" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
