import { PortalShell } from "@/components/portal/portal-shell";
import { requireRole } from "@/lib/auth";
import { one } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["student"], "/student/dashboard");
  const [settings, unreadRow] = await Promise.all([
    getSettings(),
    one<{ count: number }>(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0",
      user.id,
    ),
  ]);
  const unread = unreadRow?.count ?? 0;

  return (
    <PortalShell
      user={user}
      siteName={settings.site_name}
      subtitle={settings.site_subtitle}
      unread={unread}
      nav={[
        { href: "/student/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: "/student/reports", label: "My reports", icon: "reports" },
        { href: "/student/reports/new", label: "Report a problem", icon: "new" },
        { href: "/student/leaderboard", label: "Leaderboard", icon: "trophy" },
        { href: "/student/green-actions", label: "Green actions", icon: "leaf" },
        { href: "/student/notifications", label: "Notifications", icon: "bell", badge: unread },
        { href: "/student/profile", label: "My profile", icon: "user" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
