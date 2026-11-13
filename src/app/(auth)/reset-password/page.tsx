import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  if (!token) {
    return (
      <div className="surface p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">Reset link missing</h1>
        <p className="mt-2 text-sm text-ink-500">Open the link from your password reset email, or request a new one.</p>
        <Link href="/forgot-password" className="mt-5 inline-block text-sm font-semibold text-emerald-700 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return <ResetForm token={token} />;
}
