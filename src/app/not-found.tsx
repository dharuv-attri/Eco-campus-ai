import Link from "next/link";
import { ArrowLeft, Compass, Leaf, MapPin, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-16">
      <div className="absolute inset-0 grid-eco opacity-40" aria-hidden />
      <div className="surface relative w-full max-w-2xl overflow-hidden text-center">
        <div className="border-b bg-emerald-500/[0.05] p-8 sm:p-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <Compass className="h-8 w-8" />
          </span>
          <p className="mt-5 font-display text-5xl font-semibold tracking-tight text-forest-800 dark:text-emerald-300">
            404
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold">This path does not exist</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500 dark:text-ink-300">
            The page may have moved, or the link may be incomplete. Let&apos;s get you back to something useful.
          </p>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8">
          <Link href="/" className={buttonVariants.primary + " h-11"}>
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <Link href="/report-problem" className={buttonVariants.outline + " h-11"}>
            <Leaf className="h-4 w-4" /> Report a problem
          </Link>
          <Link href="/track" className={buttonVariants.outline + " h-11"}>
            <Search className="h-4 w-4" /> Track a report
          </Link>
          <Link href="/campus-map" className={buttonVariants.outline + " h-11"}>
            <MapPin className="h-4 w-4" /> Campus map
          </Link>
        </div>
      </div>
    </div>
  );
}
