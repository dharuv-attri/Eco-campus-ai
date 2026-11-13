import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/forms";
import { one } from "@/lib/db";

export const metadata: Metadata = { title: "Sign in" };

const errorMessages: Record<string, string> = {
  "google-not-configured":
    "Google sign-in is not configured in this environment. Use email sign-in or add Google OAuth credentials.",
  "google-cancelled": "Google sign-in was cancelled.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const errorKey = typeof params.error === "string" ? params.error : "";
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const demo = one<{ count: number }>("SELECT COUNT(*) AS count FROM users WHERE is_demo = 1");
  const showDemo =
    (process.env.NODE_ENV !== "production" || process.env.SHOW_DEMO_CREDENTIALS === "true") &&
    (demo?.count ?? 0) > 0;

  return (
    <LoginForm
      googleEnabled={googleEnabled}
      nextPath={next}
      initialError={errorKey ? errorMessages[errorKey] || decodeURIComponent(errorKey) : undefined}
      showDemo={showDemo}
    />
  );
}
