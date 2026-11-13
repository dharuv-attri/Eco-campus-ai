import "server-only";
import { cache } from "react";
import { all, one, run } from "@/lib/db";
import { DEFAULT_SETTINGS, DEFAULT_SECTIONS } from "@/lib/constants";
import { nowIso } from "@/lib/utils";

export type SettingsMap = Record<string, string>;

export const getSettings = cache(function getSettings(): SettingsMap {
  const rows = all<{ key: string; value: string }>("SELECT key, value FROM website_settings");
  const map: SettingsMap = { ...DEFAULT_SETTINGS };
  for (const row of rows) map[row.key] = row.value;
  return map;
});

export function getSetting(key: string, fallback = "") {
  const row = one<{ value: string }>("SELECT value FROM website_settings WHERE key = ?", key);
  return row?.value ?? DEFAULT_SETTINGS[key] ?? fallback;
}

export function setSetting(key: string, value: string) {
  run(
    `INSERT INTO website_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    value,
    nowIso(),
  );
}

export function ensureDefaultSettings() {
  const now = nowIso();
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    run(
      "INSERT OR IGNORE INTO website_settings (key, value, updated_at) VALUES (?, ?, ?)",
      key,
      value,
      now,
    );
  }
  for (const section of DEFAULT_SECTIONS) {
    run(
      `INSERT OR IGNORE INTO website_sections (key, label, enabled, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      section.key,
      section.label,
      section.enabled,
      section.sort_order,
      now,
    );
  }
}

export interface WebsiteSection {
  key: string;
  label: string;
  enabled: number;
  sort_order: number;
}

export const getSections = cache(function getSections(): WebsiteSection[] {
  return all<WebsiteSection>("SELECT * FROM website_sections ORDER BY sort_order ASC");
});

export function isSectionEnabled(key: string) {
  const row = one<{ enabled: number }>("SELECT enabled FROM website_sections WHERE key = ?", key);
  return row ? row.enabled === 1 : true;
}
