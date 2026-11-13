import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/forms";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { LoginRole } from "@/types";

export const metadata: Metadata = { title: "Sign in" };

const errorMessages: Record<string, string> = {
  "auth-not-configured":
    "Supabase Auth is not configured. Add the project URL and publishable key (or legacy anon key) to .env.local, then restart the app.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const errorKey = typeof params.error === "string" ? params.error : "";
  const roleParam = typeof params.role === "string" ? params.role : "";
  const initialRole: LoginRole | undefined = ["student", "staff", "admin"].includes(roleParam)
    ? (roleParam as LoginRole)
    : undefined;
  const authConfigured = isSupabaseConfigured();

  return (
    <LoginForm
      googleEnabled={authConfigured}
      nextPath={next}
      initialRole={initialRole}
      initialError={
        errorKey
          ? errorMessages[errorKey] || errorKey
          : authConfigured
            ? undefined
            : "Supabase Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local."
      }
    />
  );
}
