import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px";

export const buttonVariants = {
  primary:
    "bg-forest-800 text-white shadow-sm hover:bg-forest-700 hover:shadow-md dark:bg-emerald-600 dark:hover:bg-emerald-500",
  secondary:
    "bg-emerald-500 text-forest-950 shadow-sm hover:bg-emerald-400 dark:bg-emerald-400 dark:text-forest-950",
  outline:
    "border bg-transparent text-ink-800 hover:border-emerald-500/40 hover:bg-emerald-500/5 dark:text-ink-100",
  soft: "bg-emerald-500/10 text-forest-800 hover:bg-emerald-500/15 dark:text-emerald-300",
  ghost: "bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-200 dark:hover:bg-ink-800 dark:hover:text-white",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
  white: "bg-white text-forest-900 shadow-sm hover:bg-emerald-50",
};

export const buttonSizes = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-10 px-4",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-10 w-10 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, buttonVariants[variant], buttonSizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}) {
  return (
    <Link href={href} className={cn(base, buttonVariants[variant], buttonSizes[size], className)} {...props}>
      {children}
    </Link>
  );
}
