import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AdminSetupForm } from "@/components/auth/admin-setup-form";

export const metadata: Metadata = { title: "First Admin setup" };

export default function AdminSetupPage() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="h-5 w-5" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Secure one-time setup</span>
        </div>
        <div className="rounded-3xl border border-ink-200/70 bg-white/90 p-6 shadow-xl shadow-forest-950/5 dark:border-ink-700 dark:bg-ink-900/80 sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Create the first Admin
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">
            Choose the Admin email and password yourself. This setup can only be completed once and
            does not grant Admin privileges through public registration.
          </p>
          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs leading-5 text-ink-600 dark:text-ink-300">
            Authorize with an existing super-admin session or the server-only{" "}
            <code className="font-semibold">ADMIN_SETUP_TOKEN</code>. Use an email address you can
            verify.
          </div>
          <AdminSetupForm />
          <p className="mt-5 text-center text-xs text-ink-500">
            Already set up?{" "}
            <Link
              href="/login?role=admin"
              className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              Go to Admin sign-in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
