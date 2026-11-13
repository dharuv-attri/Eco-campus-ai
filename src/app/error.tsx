"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("EcoCampus AI application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="surface w-full max-w-xl p-7 text-center sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
          <AlertTriangle className="h-8 w-8" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500 dark:text-ink-300">
          The page could not complete this request. Your data has not been intentionally changed. Try again, or
          return to the home page.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[10px] text-ink-400">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Try again
          </Button>
          <Link href="/" className={buttonVariants.outline + " h-10"}>
            <Home className="h-4 w-4" /> Home page
          </Link>
        </div>
      </div>
    </div>
  );
}
