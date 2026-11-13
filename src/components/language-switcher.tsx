"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import type { Lang } from "@/lib/i18n";

export function LanguageSwitcher({ lang, compact = false }: { lang: Lang; compact?: boolean }) {
  const router = useRouter();

  function toggle() {
    const next = lang === "hi" ? "en" : "hi";
    document.cookie = `eco_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border bg-white/60 px-2.5 text-xs font-semibold text-ink-600 transition hover:bg-white hover:text-forest-800 dark:bg-white/5 dark:text-ink-200 dark:hover:bg-white/10"
      aria-label={`Switch language to ${lang === "hi" ? "English" : "Hindi"}`}
      title="English / हिंदी"
    >
      <Languages className="h-4 w-4" />
      {compact ? null : <span>{lang === "hi" ? "हिं" : "EN"}</span>}
    </button>
  );
}
