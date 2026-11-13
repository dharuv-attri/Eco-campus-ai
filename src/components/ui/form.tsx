import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn("field", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("field min-h-28 resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn("field appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("label", className)} {...props} />;
}

export function FieldHint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-xs text-ink-400", className)} {...props} />;
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
      {children}
    </p>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  name,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  name?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition hover:bg-emerald-500/[0.03]">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-emerald-600 bg-emerald-500" : "border-ink-300 bg-ink-200 dark:border-ink-600 dark:bg-ink-700",
        )}
        name={name}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
          style={{ height: 18, width: 18 }}
        />
      </button>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-ink-500">{description}</span> : null}
      </span>
    </label>
  );
}
