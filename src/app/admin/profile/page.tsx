import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/portal-shell";
import { ProfileForm } from "@/components/portal/profile-form";
import { requireRole } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/constants";

export const metadata: Metadata = { title: "My profile" };

export default async function AdminProfilePage() {
  const user = await requireRole(["admin", "super_admin"], "/admin/profile");

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description={`${ROLE_LABEL[user.role]} account. Keep your contact details current; role and access changes are managed in User management.`}
      />
      <ProfileForm user={user} />
    </>
  );
}
