"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";

interface SetupResult {
  email: string;
  requiresVerification: boolean;
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function AdminSetupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SetupResult | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/admin-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, confirmPassword, setupToken }),
      });
      const data: unknown = await response.json();
      if (!isRecord(data)) throw new Error("Unexpected response from the setup service.");
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Admin setup failed.",
        );
      }
      if (
        typeof data.email !== "string" ||
        typeof data.requiresVerification !== "boolean" ||
        typeof data.message !== "string"
      ) {
        throw new Error("Unexpected response from the setup service.");
      }
      setResult({
        email: data.email,
        requiresVerification: data.requiresVerification,
        message: data.message,
      });
      setPassword("");
      setConfirmPassword("");
      setSetupToken("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not complete Admin setup. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return (
      <div className="mt-6 space-y-4" role="status" aria-live="polite">
        <div
          className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
            result.requiresVerification
              ? "border-amber-500/20 bg-amber-500/[0.06] text-ink-700 dark:text-ink-200"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          }`}
        >
          <p className="font-semibold">{result.message}</p>
          <p className="mt-1 text-xs">Admin email: {result.email}</p>
        </div>
        {result.requiresVerification ? (
          <p className="text-xs leading-5 text-ink-500 dark:text-ink-300">
            Follow the verification email from Supabase Auth. Once verified, sign in with the email
            and password you chose.
          </p>
        ) : null}
        <Link
          href="/login?role=admin"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-forest-800 px-5 text-sm font-semibold text-white transition hover:bg-forest-700"
        >
          Continue to Admin sign-in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-5 text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      ) : null}
      <div>
        <Label htmlFor="admin-full-name">Admin name</Label>
        <Input
          id="admin-full-name"
          autoComplete="name"
          maxLength={100}
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="admin-email">Admin email</Label>
        <Input
          id="admin-email"
          type="email"
          autoComplete="email"
          maxLength={160}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="admin-password">Choose a password</Label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="mt-1 text-xs text-ink-400">
          At least 8 characters, including uppercase, lowercase, and a number.
        </p>
      </div>
      <div>
        <Label htmlFor="admin-confirm-password">Confirm password</Label>
        <Input
          id="admin-confirm-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="admin-setup-token">One-time setup token</Label>
        <Input
          id="admin-setup-token"
          type="password"
          autoComplete="off"
          maxLength={512}
          value={setupToken}
          onChange={(event) => setSetupToken(event.target.value)}
        />
        <p className="mt-1 text-xs text-ink-400">
          Leave blank only when signed in with an existing super-admin account.
        </p>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={saving}>
        Create first Admin account
      </Button>
    </form>
  );
}
