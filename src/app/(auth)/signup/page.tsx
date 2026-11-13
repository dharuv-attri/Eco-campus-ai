import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/forms";
import { all } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  const settings = getSettings();
  const departments = all<{ id: string; name: string }>(
    "SELECT id, name FROM departments ORDER BY name",
  ).map(({ id, name }) => ({ id, name }));
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  if (settings.registration_open === "false") {
    return (
      <div className="surface p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">Registration is closed</h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          New account registration has been disabled by the platform administrator. Existing users can
          still sign in.
        </p>
        <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-emerald-700 hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  return <SignupForm googleEnabled={googleEnabled} departments={departments} />;
}
