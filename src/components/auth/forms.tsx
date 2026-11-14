"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MailCheck,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldHint } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { LoginRole } from "@/types";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GoogleButton({
  enabled,
  role,
  nextPath,
}: {
  enabled: boolean;
  role?: LoginRole;
  nextPath?: string;
}) {
  if (!enabled) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border bg-ink-50 text-sm font-semibold text-ink-400 dark:bg-white/5"
          title="Configure Supabase Auth and enable Google in its provider settings"
        >
          <GoogleIcon /> Continue with Google
        </button>
        <p className="mt-1.5 text-center text-[10px] text-ink-400">
          Add the Supabase URL and publishable key in .env.local, and enable Google in Supabase Auth settings.
        </p>
      </div>
    );
  }
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (nextPath) params.set("next", nextPath);
  const query = params.toString();

  return (
    <a
      href={`/api/auth/google${query ? `?${query}` : ""}`}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border bg-white text-sm font-semibold text-ink-700 transition hover:bg-ink-50 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
    >
      <GoogleIcon /> Continue with Google
    </a>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-xs leading-5 text-rose-700 dark:text-rose-300"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}

function SuccessBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-xs leading-5 text-emerald-800 dark:text-emerald-300">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}

function AuthHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">{description}</p>
    </div>
  );
}

export function LoginForm({
  googleEnabled,
  nextPath,
  initialError,
  initialRole,
}: {
  googleEnabled: boolean;
  nextPath?: string;
  initialError?: string;
  initialRole?: LoginRole;
}) {
  const router = useRouter();
  const [requestedRole, setRequestedRole] = useState<LoginRole | undefined>(initialRole);
  const [view, setView] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [info, setInfo] = useState("");
  const [otpStep, setOtpStep] = useState<"email" | "code">("email");
  const [otpCode, setOtpCode] = useState("");
  const [otpDevCode, setOtpDevCode] = useState("");

  function finishLogin(data: { redirect?: string }) {
    const target =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : data.redirect || "/";
    router.push(target);
    router.refresh();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: requestedRole }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        redirect?: string;
        needsVerification?: boolean;
      };
      if (!response.ok && data.needsVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      if (!response.ok) throw new Error(data.error || "Sign-in failed.");
      finishLogin(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setLoading(false);
    }
  }

  async function requestOtp(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "login", role: requestedRole }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        devCode?: string;
        needsVerification?: boolean;
      };
      if (!response.ok) throw new Error(data.error || "Could not send a sign-in code.");
      if (data.needsVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      setInfo(data.message || "Check your email for the code.");
      if (data.devCode) setOtpDevCode(data.devCode);
      setOtpStep("code");
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a sign-in code.");
      setLoading(false);
    }
  }

  async function resendOtp() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "login", role: requestedRole }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "Could not resend the sign-in code.");
      setInfo(data.message || "A new code has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the sign-in code.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode, purpose: "login", role: requestedRole }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; redirect?: string };
      if (!response.ok) throw new Error(data.error || "Could not verify the code.");
      finishLogin(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code.");
      setLoading(false);
    }
  }

  function switchView(next: "password" | "otp") {
    setView(next);
    setError("");
    setInfo("");
    setOtpStep("email");
    setOtpCode("");
    setOtpDevCode("");
  }

  return (
    <div>
      <AuthHeading title="Welcome back" description="Sign in to report problems, track progress and manage your campus." />
      <div className="surface p-5 sm:p-7">
        <div className="mb-5">
          <p className="mb-2 text-center text-xs font-semibold text-ink-500">Choose portal (optional)</p>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink-100 p-1 dark:bg-white/5">
            {([
              ["student", "Student"],
              ["staff", "Staff"],
              ["admin", "Admin"],
            ] as const).map(([role, label]) => (
              <button
                key={role}
                type="button"
                aria-pressed={requestedRole === role}
                onClick={() => setRequestedRole(requestedRole === role ? undefined : role)}
                className={cn(
                  "rounded-lg px-2 py-2 text-xs font-semibold transition",
                  requestedRole === role
                    ? "bg-white text-forest-800 shadow-sm dark:bg-ink-800 dark:text-white"
                    : "text-ink-500 hover:text-ink-800 dark:text-ink-300",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-center text-[10px] leading-4 text-ink-400">
            Portal access is assigned to your account; choosing a portal never changes your role.
          </p>
        </div>
        <GoogleButton enabled={googleEnabled} role={requestedRole} nextPath={nextPath} />
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">
            {view === "password" ? "or with email" : "passwordless sign-in"}
          </span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {view === "password" ? (
          <form onSubmit={submit} className="space-y-4">
            {error ? <ErrorBox>{error}</ErrorBox> : null}
            <div>
              <Label htmlFor="login-email">Email address</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Password</Label>
                <Link href="/forgot-password" className="text-[11px] font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 hover:text-ink-700"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign in <ArrowRight className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={() => switchView("otp")}
              className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              <KeyRound className="h-3.5 w-3.5" /> Sign in with a one-time email code instead
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {error ? <ErrorBox>{error}</ErrorBox> : null}
            {otpStep === "email" ? (
              <form onSubmit={requestOtp} className="space-y-4">
                <p className="text-xs leading-5 text-ink-500 dark:text-ink-300">
                  We will email a one-time sign-in code. No password needed.
                </p>
                <div>
                  <Label htmlFor="otp-email">Email address</Label>
                  <Input
                    id="otp-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  <KeyRound className="h-4 w-4" /> Email me a sign-in code
                </Button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-4">
                {info ? <SuccessBox>{info}</SuccessBox> : null}
                {otpDevCode ? (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs">
                    <p className="font-semibold text-amber-700 dark:text-amber-300">Demo mode: email delivery not configured.</p>
                    <p className="mt-1 text-ink-500">
                      Your one-time sign-in code is{" "}
                      <strong className="font-mono text-base tracking-[0.3em] text-emerald-700 dark:text-emerald-300">{otpDevCode}</strong>
                    </p>
                  </div>
                ) : null}
                <div>
                  <Label htmlFor="otp-code">6-digit code</Label>
                  <Input
                    id="otp-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="text-center font-mono text-lg tracking-[0.5em]"
                  />
                  <FieldHint>Sent to {email}. Codes expire after 10 minutes and work only once.</FieldHint>
                </div>
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Verify code & sign in <ArrowRight className="h-4 w-4" />
                </Button>
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => switchView("otp")}
                    className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                  >
                    Use a different email
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void resendOtp()}
                    className="text-ink-500 hover:underline disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
            <button
              type="button"
              onClick={() => switchView("password")}
              className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              Back to password sign-in
            </button>
          </div>
        )}

        <p className="mt-5 text-center text-xs text-ink-500">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-ink-500">
          First-time administrator?{" "}
          <Link
            href="/admin-setup"
            className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
          >
            Set up the first Admin
          </Link>
        </p>
      </div>
    </div>
  );
}

const currentYear = new Date().getFullYear();
const years = ["1st year", "2nd year", "3rd year", "4th year", "5th year"];
const semesters = ["1st semester", "2nd semester", "3rd semester", "4th semester", "5th semester", "6th semester", "7th semester", "8th semester"];

export function SignupForm({
  googleEnabled,
  departments,
}: {
  googleEnabled: boolean;
  departments: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "staff">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    message: string;
    verifyUrl?: string;
    devCode?: string;
    email?: string;
  } | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    studentId: "",
    course: "",
    department: "",
    departmentId: "",
    year: "",
    semester: "",
    employeeId: "",
    designation: "",
    terms: false,
  });

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.terms) {
      setError("Please confirm responsible use before creating an account.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role,
          studentId: form.studentId,
          course: form.course,
          department: form.department,
          departmentId: form.departmentId,
          yearSemester: [form.year, form.semester].filter(Boolean).join(" / "),
          employeeId: form.employeeId,
          designation: form.designation,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        verificationUrl?: string;
        devCode?: string;
        requiresVerification?: boolean;
      };
      if (!response.ok) throw new Error(data.error || "Could not create your account.");
      setSuccess({
        message: data.message || "Account created.",
        verifyUrl: data.verificationUrl,
        devCode: data.devCode,
        email: data.requiresVerification ? form.email : undefined,
      });
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div>
        <AuthHeading title="Account created" description="A few more steps and you're ready." />
        <div className="surface space-y-4 p-6">
          <div className="flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <MailCheck className="h-7 w-7" />
            </span>
          </div>
          <p className="text-center text-sm leading-6 text-ink-600 dark:text-ink-300">{success.message}</p>
          {success.devCode ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-5">
              <p className="font-semibold text-amber-700 dark:text-amber-300">Demo mode: email delivery is not configured.</p>
              <p className="mt-1 text-ink-500">
                Your 6-digit verification code is{" "}
                <strong className="font-mono text-base tracking-[0.3em] text-emerald-700 dark:text-emerald-300">{success.devCode}</strong>
              </p>
            </div>
          ) : null}
          {success.email ? (
            <Link href={`/verify-email?email=${encodeURIComponent(success.email)}`}>
              <Button className="w-full">
                <MailCheck className="h-4 w-4" /> Verify email now
              </Button>
            </Link>
          ) : null}
          {success.verifyUrl ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-5">
              <p className="text-ink-500">Prefer a link? Use this one-time local verification link:</p>
              <Link href={success.verifyUrl} className="mt-2 block break-all font-semibold text-emerald-700 underline dark:text-emerald-300">
                {success.verifyUrl}
              </Link>
            </div>
          ) : null}
          <Link href="/login">
            <Button variant={success.email ? "outline" : "primary"} className="w-full">
              Continue to sign in
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="w-full text-center text-xs text-ink-500 hover:underline"
          >
            Register another account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading title="Create your account" description="Choose your role. Staff accounts are reviewed by an administrator." />
      <div className="surface p-5 sm:p-7">
        <GoogleButton enabled={googleEnabled} role="student" />
        <p className="mt-1.5 text-center text-[10px] leading-4 text-ink-400">
          New Google accounts start as Student. Staff and Admin roles require approval or administrator assignment.
        </p>
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">or with email</span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1 dark:bg-white/5">
          {(["student", "staff"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setRole(value);
                setError("");
              }}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold capitalize transition",
                role === value
                  ? "bg-white text-forest-800 shadow-sm dark:bg-ink-800 dark:text-white"
                  : "text-ink-500 hover:text-ink-800 dark:text-ink-300",
              )}
            >
              {value}
            </button>
          ))}
        </div>
        <p className="-mt-3 mb-4 text-center text-[10px] leading-4 text-ink-400">
          Admin accounts are created by a super administrator and cannot be self-registered.
        </p>

        <form onSubmit={submit} className="space-y-4">
          {error ? <ErrorBox>{error}</ErrorBox> : null}
          <div>
            <Label htmlFor="signup-name">Full name</Label>
            <Input
              id="signup-name"
              required
              autoComplete="name"
              value={form.fullName}
              onChange={(event) => update("fullName", event.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div>
            <Label htmlFor="signup-email">{role === "staff" ? "Official email" : "University / personal email"}</Label>
            <Input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder={role === "staff" ? "name@department.example" : "you@example.com"}
            />
          </div>

          {role === "student" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="signup-student-id">Student ID</Label>
                <Input
                  id="signup-student-id"
                  value={form.studentId}
                  onChange={(event) => update("studentId", event.target.value)}
                  placeholder="LTSU2026CSE001"
                />
              </div>
              <div>
                <Label htmlFor="signup-course">Course</Label>
                <Input
                  id="signup-course"
                  value={form.course}
                  onChange={(event) => update("course", event.target.value)}
                  placeholder="B.Tech CSE"
                />
              </div>
              <div>
                <Label htmlFor="signup-department">Department / school</Label>
                <Input
                  id="signup-department"
                  value={form.department}
                  onChange={(event) => update("department", event.target.value)}
                  placeholder="University School of Computing"
                />
              </div>
              <div>
                <Label htmlFor="signup-year">Year</Label>
                <Select id="signup-year" value={form.year} onChange={(event) => update("year", event.target.value)}>
                  <option value="">Select year</option>
                  {years.map((year) => (
                    <option key={year}>{year}</option>
                  ))}
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="signup-semester">Semester</Label>
                <Select
                  id="signup-semester"
                  value={form.semester}
                  onChange={(event) => update("semester", event.target.value)}
                >
                  <option value="">Select semester</option>
                  {semesters.map((semester) => (
                    <option key={semester}>{semester}</option>
                  ))}
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="signup-employee-id">Employee ID</Label>
                <Input
                  id="signup-employee-id"
                  required
                  value={form.employeeId}
                  onChange={(event) => update("employeeId", event.target.value)}
                  placeholder="EMP-OPS-101"
                />
              </div>
              <div>
                <Label htmlFor="signup-designation">Designation</Label>
                <Input
                  id="signup-designation"
                  value={form.designation}
                  onChange={(event) => update("designation", event.target.value)}
                  placeholder="Maintenance supervisor"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="signup-dept-select">Authorized department</Label>
                <Select
                  id="signup-dept-select"
                  required
                  value={form.departmentId}
                  onChange={(event) => update("departmentId", event.target.value)}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
                <FieldHint>An administrator must approve staff access before sign-in.</FieldHint>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              placeholder="At least 8 characters, with upper/lowercase and a number"
            />
          </div>
          <label className="flex items-start gap-2.5 text-[11px] leading-5 text-ink-500">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={(event) => update("terms", event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-ink-300 accent-emerald-600"
            />
            <span>
              I will report genuine environmental problems and understand that EcoCampus AI is an
              independent project, not an emergency service.
            </span>
          </label>
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Create account <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-ink-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ForgotForm() {
  const [step, setStep] = useState<"email" | "code" | "password" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resending, setResending] = useState(false);
  // Mirrors the server-side resend limit so the button communicates the wait
  // instead of letting every click end in a 429 error message.
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((seconds) => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  function resetToEmail() {
    setStep("email");
    setCode("");
    setPassword("");
    setConfirm("");
    setError("");
    setInfo("");
  }

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "Could not send the reset code.");
      setInfo(data.message || "Check your inbox for the 6-digit code.");
      setResendCooldown(60);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset code.");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError("");
    setInfo("");
    setResending(true);
    try {
      const response = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "Could not resend the code.");
      setCode("");
      setInfo(data.message || "A new code has been sent.");
      setResendCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code.");
    } finally {
      setResending(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "Could not verify that code.");
      setInfo(data.message || "Code verified. Choose a new password.");
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify that code.");
    } finally {
      setLoading(false);
    }
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Include at least one uppercase letter, one lowercase letter and one number.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "Could not update your password.");
      setInfo(data.message || "Password updated. You can now sign in.");
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setLoading(false);
    }
  }

  const titles = {
    email: ["Reset your password", "Enter your registered email and we'll send a 6-digit reset code."],
    code: ["Enter your reset code", `We sent a 6-digit code to ${email}. It expires in 60 minutes.`],
    password: ["Choose a new password", "Your code was verified. Use a strong password you have not used elsewhere."],
    done: ["Password updated", "Your password was changed successfully. Sign in with the new password."],
  } as const;

  return (
    <div>
      <AuthHeading title={titles[step][0]} description={titles[step][1]} />
      <div className="surface p-6">
        {step === "done" ? (
          <div className="space-y-4">
            <SuccessBox>{info || "Password updated. You can now sign in."}</SuccessBox>
            <Link href="/login">
              <Button className="w-full">
                <ArrowRight className="h-4 w-4" /> Go to sign in
              </Button>
            </Link>
          </div>
        ) : null}

        {step === "email" ? (
          <form onSubmit={requestCode} className="space-y-4">
            {error ? <ErrorBox>{error}</ErrorBox> : null}
            <div>
              <Label htmlFor="forgot-email">Email address</Label>
              <Input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" loading={loading} className="w-full">
              <MailCheck className="h-4 w-4" /> Send reset code
            </Button>
          </form>
        ) : null}

        {step === "code" ? (
          <form onSubmit={verifyCode} className="space-y-4">
            {error ? <ErrorBox>{error}</ErrorBox> : null}
            {info ? <SuccessBox>{info}</SuccessBox> : null}
            <div>
              <Label htmlFor="forgot-code">6-digit reset code</Label>
              <Input
                id="forgot-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center font-mono text-lg tracking-[0.5em]"
              />
              <FieldHint>Sent to {email}. Codes expire after 60 minutes and work only once.</FieldHint>
            </div>
            <Button type="submit" loading={loading} className="w-full">
              <ShieldCheck className="h-4 w-4" /> Verify code
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={resetToEmail}
                className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
              >
                Use a different email
              </button>
              <button
                type="button"
                disabled={loading || resending || resendCooldown > 0}
                onClick={() => void resendCode()}
                className="text-ink-500 hover:underline disabled:opacity-50"
              >
                {resending
                  ? "Sending…"
                  : resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : "Resend code"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "password" ? (
          <form onSubmit={updatePassword} className="space-y-4">
            {error ? <ErrorBox>{error}</ErrorBox> : null}
            {info ? <SuccessBox>{info}</SuccessBox> : null}
            <div>
              <Label htmlFor="forgot-password">New password</Label>
              <div className="relative">
                <Input
                  id="forgot-password"
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters, with upper/lowercase and a number"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 hover:text-ink-700"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="forgot-confirm">Confirm password</Label>
              <Input
                id="forgot-confirm"
                type={show ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Type the same password again"
              />
            </div>
            <Button type="submit" loading={loading} className="w-full">
              <KeyRound className="h-4 w-4" /> Update password
            </Button>
          </form>
        ) : null}

        {step !== "done" ? (
          <p className="mt-5 text-center text-xs text-ink-500">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
              Back to sign in
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ResetForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Include at least one uppercase letter, one lowercase letter and one number.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not reset your password.");
      setDone(true);
      setTimeout(() => router.push("/login"), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <AuthHeading title="Choose a new password" description="Use a strong password you have not used elsewhere." />
      <div className="surface p-6">
        {done ? (
          <div className="space-y-4 text-center">
            <SuccessBox>Password updated. Redirecting you to sign in…</SuccessBox>
            <Link href="/login" className="text-xs font-semibold text-emerald-700 hover:underline">
              Go to sign in now
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error ? <ErrorBox>{error}</ErrorBox> : null}
            <div>
              <Label htmlFor="reset-password">New password</Label>
              <Input
                id="reset-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="reset-confirm">Confirm password</Label>
              <Input
                id="reset-confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
            <Button type="submit" loading={loading} className="w-full">
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export function VerifyForm({ token, initialEmail }: { token?: string; initialEmail?: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(token ? "loading" : "idle");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(initialEmail || "");
  const [code, setCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendState, setResendState] = useState<{
    loading: boolean;
    message?: string;
    error?: string;
    devCode?: string;
    url?: string;
  }>({
    loading: false,
  });

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    (async () => {
      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await response.json()) as { message?: string; error?: string };
        if (!mounted) return;
        if (!response.ok) {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        } else {
          setStatus("done");
          setMessage(data.message || "Email verified.");
        }
      } catch {
        if (mounted) {
          setStatus("error");
          setMessage("Verification is temporarily unavailable.");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setStatus("idle");
    setOtpLoading(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, purpose: "verify" }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "Could not verify the code.");
      setStatus("done");
      setMessage(data.message || "Email verified.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not verify the code.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function resend(event: React.FormEvent) {
    event.preventDefault();
    setResendState({ loading: true });
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "verify" }),
      });
      const data = (await response.json()) as { message?: string; error?: string; devCode?: string; devUrl?: string };
      if (!response.ok) throw new Error(data.error || "Could not send a new verification code.");
      setResendState({ loading: false, message: data.message, devCode: data.devCode, url: data.devUrl });
    } catch (err) {
      setResendState({
        loading: false,
        error: err instanceof Error ? err.message : "Could not send a new verification code.",
      });
    }
  }

  const verified = status === "done";

  return (
    <div>
      <AuthHeading
        title={verified ? "Email verified" : status === "error" ? "Verification problem" : "Verify your email"}
        description={
          verified
            ? "Your account is one step closer to being active."
            : "Enter the 6-digit code from your email, or request a fresh code below. The code expires in 10 minutes."
        }
      />
      <div className="surface space-y-4 p-6">
        {status === "loading" ? (
          <p className="flex items-center justify-center gap-2 py-2 text-sm text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying your link…
          </p>
        ) : null}
        {verified ? <SuccessBox>{message}</SuccessBox> : null}
        {status === "error" ? <ErrorBox>{message}</ErrorBox> : null}

        {!verified ? (
          <>
            <form onSubmit={verifyCode} className="space-y-3 border-t pt-4">
              <div>
                <Label htmlFor="verify-email">Your email</Label>
                <Input
                  id="verify-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <Label htmlFor="verify-code">6-digit verification code</Label>
                <Input
                  id="verify-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="text-center font-mono text-lg tracking-[0.5em]"
                />
              </div>
              <Button type="submit" loading={otpLoading} className="w-full">
                <MailCheck className="h-4 w-4" /> Verify email
              </Button>
            </form>

            <form onSubmit={resend} className="space-y-3 border-t pt-4">
              {resendState.message ? <SuccessBox>{resendState.message}</SuccessBox> : null}
              {resendState.error ? <ErrorBox>{resendState.error}</ErrorBox> : null}
              {resendState.devCode ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs">
                  <p className="font-semibold text-amber-700 dark:text-amber-300">Demo mode: email delivery not configured.</p>
                  <p className="mt-1 text-ink-500">
                    Your new code is{" "}
                    <strong className="font-mono text-base tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
                      {resendState.devCode}
                    </strong>
                  </p>
                </div>
              ) : null}
              {resendState.url ? (
                <Link href={resendState.url} className="block break-all text-xs font-semibold text-emerald-700 underline">
                  Or open this one-time verification link
                </Link>
              ) : null}
              <Button type="submit" variant="outline" loading={resendState.loading} className="w-full">
                <MailCheck className="h-4 w-4" /> Send a new code
              </Button>
            </form>
          </>
        ) : null}
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Go to sign in
        </Link>
      </div>
    </div>
  );
}
