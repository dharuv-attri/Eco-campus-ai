import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return <ResetForm />;
}
