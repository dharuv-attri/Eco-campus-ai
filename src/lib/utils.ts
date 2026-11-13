import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CATEGORY_MAP, STATUS_META, type StatusValue } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(d);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function timeAgo(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - d.getTime();
  if (Number.isNaN(diff)) return "—";
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(d);
}

export function categoryLabel(value: string) {
  return CATEGORY_MAP[value]?.label ?? "Environmental problem";
}

export function statusMeta(value: string) {
  return STATUS_META[value as StatusValue] ?? STATUS_META.submitted;
}

export function priorityLabel(value: string) {
  const labels: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    emergency: "Emergency",
  };
  return labels[value] ?? value;
}

export function initials(name: string | null | undefined) {
  if (!name) return "EC";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatCompact(n: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Removes markup/control characters from user-entered plain text. */
export function sanitizeText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function parseJsonSafe<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "hidden";
  return `${name.slice(0, 2)}${"•".repeat(Math.max(2, name.length - 2))}@${domain}`;
}

export function truncate(value: string, max = 140) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function newId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function sameWeek(dateValue: string) {
  const d = new Date(dateValue);
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  return d >= start;
}

export function sameMonth(dateValue: string) {
  const d = new Date(dateValue);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function safeColor(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export function safeImageUrl(value: string | null | undefined) {
  if (!value) return "";
  if (/^\/uploads\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}
