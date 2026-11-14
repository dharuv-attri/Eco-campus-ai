import { PortalShell } from "@/components/portal/portal-shell";
import { requireRole } from "@/lib/auth";
import { one } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin", "super_admin"], "/admin/dashboard");
  const [settings, unreadRow, pendingStaffRow] = await Promise.all([
    getSettings(),
    one<{ count: number }>(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0",
      user.id,
    ),
    one<{ count: number }>(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'staff' AND status = 'pending'",
    ),
  ]);
  const unread = unreadRow?.count ?? 0;
  const pendingStaff = pendingStaffRow?.count ?? 0;

  return (
    <PortalShell
      user={user}
      siteName={settings.site_name}
      subtitle={settings.site_subtitle}
      unread={unread}
      nav={[
        { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: "/admin/complaints", label: "Complaints", icon: "reports" },
        { href: "/admin/users", label: "Users", icon: "users", badge: pendingStaff },
        { href: "/admin/departments", label: "Departments", icon: "building" },
        { href: "/admin/map", label: "Campus map", icon: "map" },
        { href: "/admin/cms", label: "Website CMS", icon: "globe" },
        { href: "/admin/announcements", label: "Announcements", icon: "megaphone" },
        { href: "/admin/awareness", label: "Awareness articles", icon: "book" },
        { href: "/admin/activities", label: "Green activities", icon: "leaf" },
        { href: "/admin/reports", label: "Reports & exports", icon: "chart" },
        { href: "/admin/leaderboard", label: "Leaderboard", icon: "trophy" },
        { href: "/admin/audit", label: "Audit log", icon: "audit" },
        { href: "/admin/notifications", label: "Notifications", icon: "bell", badge: unread },
        { href: "/admin/profile", label: "My profile", icon: "user" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
