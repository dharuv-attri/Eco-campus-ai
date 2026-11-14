import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/portal-shell";
import { ProfileForm } from "@/components/portal/profile-form";
import { requireRole } from "@/lib/auth";
import { getStudentStats } from "@/lib/analytics";

export const metadata: Metadata = { title: "My profile" };

export default async function StudentProfilePage() {
  const user = await requireRole(["student"], "/student/profile");
  const stats = await getStudentStats(user.id);
  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description={`${stats.total} reports · ${stats.points} green points. Keep your contact details current so the campus team can follow up.`}
      />
      <ProfileForm user={user} />
    </>
  );
}
