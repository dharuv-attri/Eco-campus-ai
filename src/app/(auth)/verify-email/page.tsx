import type { Metadata } from "next";
import { VerifyForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;
  const email = typeof params.email === "string" ? params.email : undefined;
  return <VerifyForm token={token} initialEmail={email} />;
}
