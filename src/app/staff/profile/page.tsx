import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/portal-shell";
import { ProfileForm } from "@/components/portal/profile-form";
import { requireRole } from "@/lib/auth";
import { getStaffStats } from "@/lib/analytics";

export const metadata: Metadata = { title: "My profile" };

export default async function StaffProfilePage() {
  const user = await requireRole(["staff"], "/staff/profile");
  const stats = getStaffStats(user);
  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description={`${stats.total} assigned report${stats.total === 1 ? "" : "s"} · ${stats.resolved} resolved. Keep your department and contact details current.`}
      />
      <ProfileForm user={user} />
    </>
  );
}
